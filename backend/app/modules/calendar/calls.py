"""Reminder calls: the consent, the ONE in-process reminder loop, and what the call records.

The owner's decisions (13 Nov 2026), all restated in the spec section 6:
- NO external cron and NO separate voice service. The backend never sleeps (the owner's Render plan
  is Pro), so one always-on loop ticks every ~30 seconds here, started in the app lifespan. It is the
  only background thing in the app: reminders, retries and reconciliation all live in `run_once`.
- The app reminder is the main path. A call happens only for items whose channel is `call` or `both`,
  ONLY for a person with a valid consent, ONLY inside their allowed hours, and at most TWICE
  (no answer: try again once after 10 minutes, then stop for good).
- The unique key on call_attempts (item, time, attempt) makes the loop safe to run twice, so a
  redeploy in the middle of a tick can never place the same call again.
- A revoked or missing consent is `blocked`, never a call. Quiet hours always win: outside the
  agreed hours nothing is dialled and nothing is recorded; the thing simply goes missed, where the
  family can see it.
- The call itself is placed by the voice module the backend already has; the reminder context rides
  along on the call record, and the `calendar_outcome` tool (handled in voice/session.py) writes back
  what the person said and marks the plan done on "took it".
- The dialling happens AFTER the booking transaction is closed, so a slow network never holds a
  pooled database connection open.
"""
import asyncio
import logging
import os
from datetime import datetime, timedelta, time as time_of_day, timezone

from sqlalchemy import Connection, text

from ..voice import logic as voice_logic
from ..voice import service as voice_service
from ..voice.service import Refused
from .service import expand

log = logging.getLogger("calendar.calls")

TICK_S = 30            # the loop's heartbeat
DUE_WINDOW_MIN = 5     # an occurrence is "due now" for this long after its time
RETRY_AFTER_MIN = 10   # no answer: try again once, this long later
MAX_ATTEMPTS = 2
STUCK_MIN = 30         # a queued attempt that could never be placed becomes failed after this

# The call's opening line, in the person's language. The agent may never give medical advice.
BRIEFS = {
    "en": ("Hello {name}, this is Wisdom. It is time for {title}. Have you done it? "
           "Say yes if you have done it, later if you will do it after some time, and help if you need someone. "
           "I never give medical advice - about medicines, ask your doctor."),
    "hi": ("नमस्ते {name}, मैं Wisdom बोल रहा हूँ। {title} का समय हो गया है। क्या आपने कर लिया? "
           "हाँ बोलिए अगर कर लिया; बाद में अगर थोड़ी देर में करेंगे; मदद अगर किसी की चाहिए। "
           "मैं दवा की सलाह नहीं देती - दवा के बारे में अपने डॉक्टर से पूछें।"),
    "bn": ("নমস্কার {name}, আমি Wisdom থেকে বলছি। {title}-এর সময় হয়ে গেছে। আপনি কি করেছেন? "
           "হ্যাঁ বলুন যদি করে থাকেন; পরে বলুন যদি একটু পরে করবেন; সাহায্য বলুন যদি কারও দরকার হয়। "
           "আমি ওষুধের পরামর্শ দিই না - ওষুধের বিষয়ে ডাক্তারকে জিজ্ঞাসা করুন।"),
    "ta": ("வணக்கம் {name}, நான் Wisdom சொல்கிறேன். {title} க்கான நேரம் ஆகிவிட்டது. நீங்கள் செய்தீர்களா? "
           "செய்திருந்தால் ஆம் என்று சொல்லுங்கள்; பிறகு செய்வீர்கள் என்றால் பிறகு என்று சொல்லுங்கள்; "
           "உதவி வேண்டுமானால் உதவி என்று சொல்லுங்கள். மருந்து பற்றி நான் ஆலோசனை சொல்வதில்லை - உங்கள் மருத்துவரிடம் கேளுங்கள்."),
    "zh": ("您好{name}，我是 Wisdom。到{title}的时间了。您做了吗？做完了请说“做了”；稍后做请说“稍后”；需要人说请说“帮忙”。"
           "我不提供用药建议——关于药物，请问您的医生。"),
    "ms": ("Halo {name}, saya dari Wisdom. Sudah masanya untuk {title}. Sudah buat? "
           "Kata ya jika sudah, nanti jika akan buat selepas ini, dan tolong jika perlukan seseorang. "
           "Saya tidak memberi nasihat perubatan - tentang ubat, tanya doktor anda."),
}

# The voice module speaks BCP-47 tags; the consent table keeps the app's short codes.
VOICE_LANGUAGES = {"en": "en-IN", "hi": "hi-IN", "bn": "bn-IN", "ta": "ta-IN", "zh": "zh-CN", "ms": "ms-MY"}


class CallError(Exception):
    def __init__(self, code: str, status_code: int, field: str | None = None):
        super().__init__(code)
        self.code, self.status_code, self.field = code, status_code, field


def _loop_enabled() -> bool:
    """Tests turn the ticking loop off with REMINDER_LOOP=off; they call run_once() themselves."""
    return os.environ.get("REMINDER_LOOP", "on") != "off"


async def loop() -> None:
    """The one always-on background thing. Sleeps between ticks; every failure is logged, never fatal."""
    while True:
        try:
            if _loop_enabled():
                await run_once()
        except Exception as e:  # noqa: BLE001 - the loop must outlive any single failure
            log.warning("[reminder] tick failed: %s: %s", type(e).__name__, e)
        await asyncio.sleep(TICK_S)


# ---------------------------------------------------------------- consent

def _checked(conn: Connection, me: str, person_id: str | None) -> str:
    """The person whose consent is being read or written: me, or somebody I act for (checked live)."""
    from .service import _checked_person

    return _checked_person(conn, me, person_id)


def get_consent(conn: Connection, me: str, person_id: str | None) -> dict:
    pid = _checked(conn, me, person_id)
    row = conn.execute(text("select * from call_consents where person_id = cast(:p as uuid)"), {"p": pid}).first()
    if not row:
        return {"person_id": pid, "agreed": False}
    return {
        "person_id": pid, "agreed": row.revoked_at is None,
        "phone_masked": voice_logic.mask(row.phone_e164),
        "language": row.language,
        "window_from": row.window_from.isoformat()[:5], "window_to": row.window_to.isoformat()[:5],
        "agreed_at": row.agreed_at.isoformat(), "revoked": row.revoked_at is not None,
    }


def put_consent(conn: Connection, me: str, b: dict) -> dict:
    """The person agrees for themselves; a helper may record it ONLY with the person present (explicit tick)."""
    pid = _checked(conn, me, b.get("person_id"))
    if pid != me and not b.get("person_present"):
        raise CallError("person_present_needed", 422, field="person_present")
    phone = voice_logic.normalize_number(str(b.get("phone") or ""))
    if not voice_logic.is_e164(phone):
        raise CallError("validation", 422, field="phone")
    language = str(b.get("language") or "en")
    if language not in BRIEFS:
        raise CallError("validation", 422, field="language")
    window_from = _window(b.get("window_from"), "08:00", "window_from")
    window_to = _window(b.get("window_to"), "20:00", "window_to")
    if window_from >= window_to:
        raise CallError("validation", 422, field="window_to")
    conn.execute(text("""
        insert into call_consents (person_id, phone_e164, language, window_from, window_to, agreed_at, agreed_by)
        values (cast(:p as uuid), :ph, :l, :wf, :wt, now(), cast(:by as uuid))
        on conflict (person_id) do update set phone_e164 = :ph, language = :l, window_from = :wf, window_to = :wt,
          agreed_at = now(), agreed_by = cast(:by as uuid), revoked_at = null
    """), {"p": pid, "ph": phone, "l": language, "wf": window_from, "wt": window_to, "by": me})
    return get_consent(conn, me, b.get("person_id"))


def revoke_consent(conn: Connection, me: str, person_id: str | None) -> dict:
    """Only the person themselves may stop the calls ('stop calling me' said to the agent counts)."""
    if person_id and person_id != me:
        raise CallError("no_access", 403)
    conn.execute(text("update call_consents set revoked_at = now() where person_id = cast(:p as uuid) and revoked_at is null"),
                 {"p": me})
    return {"person_id": me, "agreed": False}


def _window(value, default: str, field: str) -> time_of_day:
    raw = str(value or default)
    try:
        h, m = raw.split(":")[:2]
        return time_of_day(int(h), int(m))
    except (ValueError, TypeError) as e:
        raise CallError("validation", 422, field=field) from e


# ---------------------------------------------------------------- the loop's tick

AGENT_CALL = ("You are calling {name} as they asked, on a schedule they set themselves ({title}). Their own request for this call: “{brief}”. "
              "Open warmly, do exactly that (teach, quiz, practise, prepare, talk it through), keep your turns short and interactive, and let them lead the pace. "
              "When the session is done, or they want to stop, call calendar_outcome: took_it if the session happened, will_do_later if they ask to do it later, needs_help if they need someone. Then say goodbye.")


def _call_tools(full: bool) -> list[str]:
    """A plain reminder call stays small; a call with the person's own instruction is the full companion (skills, memory, web search)."""
    if not full:
        return ["calendar_outcome"]
    from ..skills import registry

    return ["calendar_outcome", "web_search", *[s["name"] for s in registry.listing(voice_only=True)]]


def brief_for(language: str, name: str, title: str) -> str:
    return BRIEFS.get(language, BRIEFS["en"]).format(name=name, title=title)


async def run_once(now: datetime | None = None) -> dict:
    """One tick: find due call reminders, book their attempts, place the calls that may go out."""
    from ...core.db import engine

    now = now or datetime.now(timezone.utc)
    work: list[dict] = []
    with engine().begin() as conn:
        reconcile(conn, now)
        items = conn.execute(
            text("select * from calendar_items where status = 'active' and channel in ('call','both')"),
        ).all()
        for it in items:
            starts = expand(it, now - timedelta(minutes=DUE_WINDOW_MIN), now)
            if not starts:
                continue
            consent = conn.execute(
                text("select * from call_consents where person_id = cast(:p as uuid)"), {"p": str(it.person_id)},
            ).first()
            display = conn.execute(
                text("select display_name from users where id = cast(:p as uuid)"), {"p": str(it.person_id)},
            ).first()
            first_name = ((display.display_name if display else "") or "").split(" ")[0][:20]
            for occurs in starts:
                marked = conn.execute(
                    text("select 1 from calendar_marks where item_id = cast(:i as uuid) and occurs_at = :o"),
                    {"i": str(it.id), "o": occurs},
                ).first()
                if marked:
                    continue
                booked = _book_attempt(conn, it, occurs, consent, now, first_name)
                if booked:
                    work.append(booked)
    for w in work:
        if w["kind"] == "placed":
            await _place(w, now)
    return {"placed": sum(1 for w in work if w["kind"] == "placed"), "blocked": sum(1 for w in work if w["kind"] == "blocked")}


def _book_attempt(conn: Connection, it, occurs: datetime, consent, now: datetime, first_name: str) -> dict | None:
    """Claim (or re-read) this occurrence's attempt. Returns the work to do, or None (leave it be)."""
    rows = conn.execute(
        text("select * from call_attempts where item_id = cast(:i as uuid) and occurs_at = :o order by attempt_no"),
        {"i": str(it.id), "o": occurs},
    ).all()
    base = {"item_id": str(it.id), "occurs_at": occurs, "person_id": str(it.person_id), "title": str(it.title)[:80],
            "first_name": first_name, "agent_brief": getattr(it, "agent_brief", None)}
    if any(r.status in ("acknowledged", "answered") for r in rows):
        return None
    if not consent or consent.revoked_at is not None:
        # the person's word is missing or taken back: record it honestly, once, never call
        if rows:
            return None
        conn.execute(text("""
            insert into call_attempts (item_id, person_id, occurs_at, attempt_no, status)
            values (cast(:i as uuid), cast(:p as uuid), :o, 1, 'blocked')
            on conflict (item_id, occurs_at, attempt_no) do nothing
        """), {"i": str(it.id), "p": str(it.person_id), "o": occurs})
        return {**base, "kind": "blocked"}
    local = (occurs + timedelta(minutes=int(it.tz_offset_min))).time().replace(second=0, microsecond=0)
    if not (consent.window_from <= local <= consent.window_to):
        return None  # quiet hours always win
    pending = [r for r in rows if r.status in ("queued", "dialing")]
    if pending:
        # a queued attempt is placed now; a dialing one is already on the phone, wait for it
        if pending[-1].status != "queued":
            return None
        return {**base, "kind": "placed", "attempt_no": int(pending[-1].attempt_no), "attempt_id": str(pending[-1].id),
                "phone": consent.phone_e164, "language": consent.language,
                "voice_language": VOICE_LANGUAGES.get(consent.language, "en-IN")}
    if len(rows) >= MAX_ATTEMPTS:
        return None
    if rows:
        last = rows[-1]
        if last.status not in ("no_answer", "failed") or now - last.created_at < timedelta(minutes=RETRY_AFTER_MIN):
            return None
        attempt_no = int(last.attempt_no) + 1
    else:
        attempt_no = 1
    inserted = conn.execute(text("""
        insert into call_attempts (item_id, person_id, occurs_at, attempt_no, status)
        values (cast(:i as uuid), cast(:p as uuid), :o, :n, 'queued')
        on conflict (item_id, occurs_at, attempt_no) do nothing
        returning id, attempt_no
    """), {"i": str(it.id), "p": str(it.person_id), "o": occurs, "n": attempt_no}).first()
    if not inserted:
        return None
    return {**base, "kind": "placed", "attempt_no": int(inserted.attempt_no), "attempt_id": str(inserted.id),
            "phone": consent.phone_e164, "language": consent.language,
            "voice_language": VOICE_LANGUAGES.get(consent.language, "en-IN")}


def _language_rules(person_id: str) -> str:
    """The person's own list of spoken languages, so the caller only guesses among them and asks to repeat when unsure."""
    from ...core import languages
    from ...core.db import engine

    try:
        with engine().connect() as conn:
            r = conn.execute(text("select spoken_languages, comm_language, language from users where id = cast(:p as uuid)"), {"p": person_id}).first()
    except Exception:  # noqa: BLE001 - the reminder must still go out
        return ""
    return ("\n\n" + languages.rules(list(r.spoken_languages or []), r.comm_language, r.language)) if r else ""


async def _place(work: dict, now: datetime) -> None:
    """Dial one already-claimed attempt. The attempt is marked dialing BEFORE the dial, so no second
    tick can ever ring the same attempt again; a transient refusal puts it back in the queue."""
    from ...core.db import engine

    with engine().begin() as conn:
        row = conn.execute(
            text("select created_at from call_attempts where id = cast(:a as uuid) and status = 'queued' for update"),
            {"a": work["attempt_id"]},
        ).first()
        if not row:  # someone else claimed (or closed) it already
            return
        if row.created_at.replace(tzinfo=timezone.utc) < now - timedelta(minutes=STUCK_MIN):
            conn.execute(text("update call_attempts set status = 'failed' where id = cast(:a as uuid)"),
                         {"a": work["attempt_id"]})
            return
        conn.execute(text("update call_attempts set status = 'dialing' where id = cast(:a as uuid)"),
                     {"a": work["attempt_id"]})
    try:
        placed = await voice_service.start_call({
            "to": work["phone"],
            "consent": True,  # the consent table IS the standing yes; the voice layer re-checks the allowlist
            "language": work["voice_language"],
            "brief": (AGENT_CALL.format(name=work["first_name"], title=work["title"], brief=work["agent_brief"]) if work.get("agent_brief")
                      else brief_for(work["language"], work["first_name"], work["title"])) + _language_rules(work["person_id"]),
            "name": work["first_name"],
            "tools": _call_tools(bool(work.get("agent_brief"))),
            "user_id": work["person_id"] if work.get("agent_brief") else None,
            "reminder": {"item_id": work["item_id"], "occurs_at": work["occurs_at"].isoformat(),
                         "attempt_no": work["attempt_no"], "person_id": work["person_id"], "title": work["title"]},
        }, admin_id="reminder-loop")
    except Refused as e:
        if e.code in ("CALL_IN_PROGRESS", "RATE_LIMITED", "PROVIDER_UNREACHABLE"):
            log.info("[reminder] call for item %s deferred: %s", work["item_id"][:8], e.code)
            back = "queued"  # the next tick tries again
        else:
            log.warning("[reminder] call for item %s refused: %s", work["item_id"][:8], e.code)
            back = "blocked"
        with engine().begin() as conn:
            conn.execute(text("update call_attempts set status = :s where id = cast(:a as uuid)"),
                         {"a": work["attempt_id"], "s": back})
        return
    with engine().begin() as conn:
        conn.execute(text("update call_attempts set status = 'dialing', voice_call_id = :v where id = cast(:a as uuid)"),
                     {"a": work["attempt_id"], "v": placed["call_id"]})
    log.info("[reminder] call placed for item %s, occurrence %s, attempt %s",
             work["item_id"][:8], work["occurs_at"], work["attempt_no"])


def reconcile(conn: Connection, now: datetime) -> int:
    """Attempts whose call ended without an answer become no_answer/failed, so the retry rule can act."""
    from ..voice import store as voice_store

    rows = conn.execute(
        text("select * from call_attempts where status in ('dialing','queued') and created_at < :t"),
        {"t": now - timedelta(minutes=RETRY_AFTER_MIN)},
    ).all()
    changed = 0
    for r in rows:
        rec = voice_store.get_live(r.voice_call_id) if r.voice_call_id else None
        new = None
        age = now - r.created_at.replace(tzinfo=timezone.utc)
        if r.status == "queued" and age > timedelta(minutes=STUCK_MIN):
            new = "failed"
        elif rec and rec["status"] not in voice_store.ACTIVE:
            new = "failed" if rec.get("error") else "no_answer"
        elif not rec and r.status == "dialing" and age > timedelta(minutes=15):
            new = "no_answer"  # the record is gone without a word: treat as nobody picking up
        if new:
            conn.execute(text("update call_attempts set status = :s where id = cast(:a as uuid)"),
                         {"a": str(r.id), "s": new})
            changed += 1
    return changed


# ---------------------------------------------------------------- what the call records

async def call_outcome(rec: dict, answer: str) -> dict:
    """The calendar_outcome tool, called by the phone agent: what did the person say?"""
    from ...core.db import engine

    reminder = rec.get("reminder") or {}
    if not reminder.get("item_id") or answer not in ("took_it", "will_do_later", "needs_help"):
        return {"ok": False, "note": "I could not record that. Say sorry briefly and end the call."}
    with engine().begin() as conn:
        conn.execute(text("""
            update call_attempts set status = 'acknowledged', outcome = :o
            where item_id = cast(:i as uuid) and occurs_at = :t and attempt_no = :n
        """), {"i": reminder["item_id"], "t": datetime.fromisoformat(reminder["occurs_at"]),
               "n": int(reminder["attempt_no"]), "o": answer})
        if answer == "took_it":
            conn.execute(text("""
                insert into calendar_marks (item_id, occurs_at, status, marked_by)
                values (cast(:i as uuid), :t, 'done', cast(:p as uuid))
                on conflict (item_id, occurs_at) do nothing
            """), {"i": reminder["item_id"], "t": datetime.fromisoformat(reminder["occurs_at"]),
                   "p": reminder.get("person_id")})
    notes = {
        "took_it": "Recorded: they have done it. Thank them warmly, say goodbye and end the call.",
        "will_do_later": "Recorded: they will do it later. Remind them once kindly, say goodbye and end the call.",
        "needs_help": "Recorded: they need someone. Assure them their family will see it in the app, say goodbye and end the call.",
    }
    return {"ok": True, "note": notes[answer]}
