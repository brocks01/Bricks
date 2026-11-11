"""Translation of member-written content. The rules this file exists to keep:

  * THE ORIGINAL IS THE CONTENT. A translation is a derived cache row, never the thing itself, and it is
    served only while its `content_version` matches the original's. Editing the original bumps the version
    (`bump_version`), which makes the older rows stale; they are never served as current again.
  * A translation INHERITS the permission of its original: every item is checked with the same community
    membership check the original uses (`communities.service.is_member`). There is no second way in.
  * The cache key is (content type, content id, content version, source language, target language), so the
    same text and the same pair is never translated twice.
  * Source language: the author's own word when they gave one, otherwise a real detector (the provider's
    `detect`), stored on the original the first time it is needed. Never a script guess - Malay and English
    are both Latin letters.
  * Nothing that must not move ever reaches a provider: links, addresses, @mentions, dates, times, numbers,
    emoji, the glossary's terms and the names of the community's members are wrapped in markers first and
    put back afterwards (`protect` / `restore`).
  * Private content never reaches a third party: only the local engine may serve it, and with none
    configured the answer is the original with status "private".
  * Counters: per person and per provider, per day, from the limits in settings. Over a limit is a clean
    refusal, never a crash.
  * Every provider failing (or none configured) answers the ORIGINAL text with status "unavailable", never
    an error page: a reader who cannot get a translation still gets the content.
"""
import re
from dataclasses import dataclass
from functools import lru_cache

from sqlalchemy import Connection, bindparam, text

from ...core.config import get_settings
from ..communities.service import CommunityError, is_member
from . import providers
from .providers import ProviderError

MAX_BATCH = 50          # items in one POST /v1/translate/batch
MAX_CHARS_CALL = 4000   # characters in one provider call
MAX_ITEMS_CALL = 40     # strings in one provider call
SENTENCE = 320          # cut anything longer at a sentence boundary before it is sent
MAX_TEXT = 4000         # characters of free text in one POST /v1/translate/text


class TranslateError(Exception):
    """A refusal with a machine code the app turns into words in the person's language."""

    def __init__(self, code: str, status: int = 400, **extra):
        super().__init__(code)
        self.code, self.status, self.extra = code, status, extra


# --------------------------------------------------------------------------- what may be translated
@dataclass(frozen=True)
class Kind:
    table: str                     # the real table, never built from client input
    fields: tuple[str, ...]        # the columns a member may ask for
    private: bool = False          # private kinds are never sent to a third-party provider


# Every piece of member-written text that lives inside a community. All five carry `community_id`, so the
# one membership check covers all of them.
KINDS: dict[str, Kind] = {
    "announcement": Kind("announcements", ("title", "body")),
    "activity": Kind("activities", ("title", "description")),
    "opportunity": Kind("opportunities", ("title", "description")),
    "contribution": Kind("contributions", ("description",)),
    "community": Kind("communities", ("name", "description")),
}


# --------------------------------------------------------------------------- never-translate protection
OPEN, CLOSE = "", ""
_SLOT = re.compile(re.escape(OPEN) + r"(\d+)" + re.escape(CLOSE))

_WD = r"(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*"
_MO = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*"
# One expression, one pass: the first alternative that matches at the leftmost character wins, so a link is
# taken whole before anything inside it could be mistaken for a number or a mention - and a marker written
# by an earlier alternative can never be re-read by a later one.
PROTECT_PATTERNS = (
    r"https?://\S+|www\.[^\s]+",                                                    # links
    r"\b[\w.+-]+@[\w-]+\.[A-Za-z]{2,}\b",                                           # email addresses
    r"(?<![\w@])@\w+",                                                              # @mentions
    rf"\b{_WD},?\s+\d{{1,2}}(?:st|nd|rd|th)?\s+{_MO}\.?(?:,?\s+\d{{4}})?\b",        # Sun, 16 Nov 2026
    rf"\b\d{{1,2}}(?:st|nd|rd|th)?\s+{_MO}\.?(?:,?\s+\d{{4}})?\b",                  # 16 Nov 2026
    rf"\b{_MO}\.?\s+\d{{1,2}}(?:st|nd|rd|th)?(?:,?\s+\d{{4}})?\b",                  # Nov 16, 2026
    r"\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b",                                         # 16/11/2026
    r"\b\d{4}-\d{2}-\d{2}\b",                                                       # 2026-11-16
    r"\b\d{1,2}:\d{2}(?:\s?[AaPp]\.?[Mm]\.?)?",                                     # 6:00 AM
    r"\b\d+(?:[.,]\d+)*%?",                                                         # 12,500 and 62%
    r"[\U0001F000-\U0001FAFF☀-➿⬀-⯿️‍⃣©®™〰〽㊗㊙]+",  # emoji, whole across ZWJ
)
_COMBINED = "|".join(f"(?:{p})" for p in PROTECT_PATTERNS)


@lru_cache(maxsize=128)
def _rx(terms: tuple[str, ...]) -> re.Pattern:
    return re.compile(_COMBINED + "".join(f"|(?:{re.escape(t)})" for t in terms))


def protect(body: str, terms: tuple[str, ...] = ()) -> tuple[str, list[str]]:
    """Wrap everything the translator must not touch. Returns the masked text and the originals in order."""
    slots: list[str] = []

    def slot(s: str) -> str:
        slots.append(s)
        return f"{OPEN}{len(slots) - 1}{CLOSE}"

    return _rx(tuple(terms)).sub(lambda m: slot(m.group(0)), body), slots


def _intact(masked: str, count: int) -> bool:
    """True when the provider handed back every marker it was given and invented none."""
    return {int(m.group(1)) for m in _SLOT.finditer(masked)} == set(range(count))


def restore(masked: str, slots: list[str]) -> str:
    def put(m: re.Match) -> str:
        i = int(m.group(1))
        return slots[i] if 0 <= i < len(slots) else ""
    return _SLOT.sub(put, masked)


_SPLIT = re.compile(r"([.!?।]\s+|\n+)")


def split(body: str, limit: int = SENTENCE) -> list[str]:
    """Cut long text at sentence boundaries so no provider call carries a wall of text. Nothing is lost:
    "".join(split(s)) == s, and line breaks ride along with the sentence they end."""
    if len(body) <= limit:
        return [body]
    out: list[str] = []
    buf = ""
    for part in _SPLIT.split(body):
        if not part:
            continue
        if _SPLIT.fullmatch(part):
            buf += part
            continue
        while len(part) > limit:              # one sentence longer than the limit: cut it the hard way
            if buf:
                out.append(buf)
                buf = ""
            out.append(part[:limit])
            part = part[limit:]
        if buf and len(buf) + len(part) > limit:
            out.append(buf)
            buf = part
        else:
            buf += part
    if buf:
        out.append(buf)
    return out or [body]


# --------------------------------------------------------------------------- the original, and who may read it
def _load(conn: Connection, user_id: str, kind: str, content_id: str, field: str) -> dict:
    k = KINDS.get(kind)
    if k is None:
        raise TranslateError("bad_type", 422, type=str(kind)[:40])
    if field not in k.fields:
        raise TranslateError("bad_field", 422, field=str(field)[:40])
    # The table and the column come from KINDS above, never from the request.
    row = conn.execute(
        text(f"select id, community_id, version, source_lang, {field} as value from {k.table} where id = :i"),
        {"i": content_id},
    ).first()
    if row is None:
        raise TranslateError("not_found", 404)
    try:
        is_member(conn, user_id, str(row.community_id))
    except CommunityError as e:                # the original is unreadable, so its translation is too
        raise TranslateError("not_readable", 403) from e
    return {"kind": kind, "id": str(row.id), "field": field, "value": row.value or "",
            "version": int(row.version), "source_lang": row.source_lang, "community_id": str(row.community_id)}


def _names(conn: Connection, community_ids: list[str]) -> tuple[str, ...]:
    """The people in these communities, so their names survive a translation untouched. Case-sensitive and
    whole-word: a member called Will protects "Will", never lowercase "will"."""
    if not community_ids:
        return ()
    stmt = text(
        "select distinct u.display_name from memberships m join users u on u.id = m.user_id "
        "where m.community_id in :ids and m.status = 'active' and u.display_name is not null"
    ).bindparams(bindparam("ids", expanding=True))
    got = {r[0].strip() for r in conn.execute(stmt, {"ids": community_ids}).all() if r[0] and len(r[0].strip()) >= 4}
    return tuple(sorted(got))[:500]


def _glossary(conn: Connection, source: str | None) -> tuple[tuple[str, str], ...]:
    """(term, replacement) pairs written in the source language. keep = leave it alone; keep = false with a
    replacement = force that form into the result after the translation. Read at translate time, so a
    correction takes effect on the very next request."""
    rows = conn.execute(
        text("select term, keep, replacement from translation_glossary where language = :s"), {"s": source or ""}
    ).all()
    return tuple((r.term, r.replacement) for r in rows if r.term)


# --------------------------------------------------------------------------- providers
def _lang(code: str) -> str:
    c = (code or "").strip().lower()
    return c.split("-")[0].split("_")[0] if c else ""


def _detect(texts: list[str]) -> list[str] | None:
    """One detection call for everything that arrived without a stated language. None when no provider can
    do it - then the item cannot be placed, and we answer with the original."""
    for p in providers.configured():
        try:
            got = p.detect(texts)
        except ProviderError:
            continue
        if len(got) == len(texts):
            return [_lang(c) for c in got]
    return None


def _hop(p, sent: list[str], source: str | None, target: str) -> list[str]:
    """One direction, one provider, with the safety net: the wrong number of answers is retried one string
    at a time, once. A timeout or a quota is not retried here - that would only cost the same wait again."""
    try:
        got = p.translate(list(sent), source, target)
    except ProviderError as e:
        if e.code not in providers.RETRYABLE:
            raise
    else:
        if len(got) == len(sent):
            return got
    out: list[str] = []
    for one in sent:
        hit = p.translate([one], source, target)
        if len(hit) != 1:
            raise ProviderError("length")
        out.append(hit[0])
    return out


def _call(p, sent: list[str], source: str | None, target: str) -> list[str]:
    if p.pairs is not None and source and (source, target) not in p.pairs:
        return _hop(p, _hop(p, sent, source, "en"), "en", target)   # no direct pair: go through English
    return _hop(p, sent, source, target)


def _room(conn: Connection, provider: str, pending: int) -> bool:
    """Is this provider still inside today's total? One that is over it is skipped, not an error."""
    used = conn.execute(
        text("select coalesce(sum(chars), 0) from translation_usage where day = current_date and provider = :p"),
        {"p": provider},
    ).scalar_one()
    return int(used) + pending <= get_settings().translate_daily_chars_total


def _charge(conn: Connection, provider: str, user_id: str, chars: int) -> None:
    if chars <= 0:
        return
    conn.execute(
        text(
            "insert into translation_usage (day, provider, user_id, chars) values (current_date, :p, :u, :c) "
            "on conflict (day, provider, user_id) do update set chars = translation_usage.chars + excluded.chars"
        ),
        {"p": provider, "u": user_id, "c": chars},
    )


def _user_room(conn: Connection, user_id: str, pending: int) -> None:
    s = get_settings()
    used = conn.execute(
        text("select coalesce(sum(chars), 0) from translation_usage where day = current_date and user_id = :u"),
        {"u": user_id},
    ).scalar_one()
    if int(used) + pending > s.translate_daily_chars_per_user:
        raise TranslateError("daily_user_limit", 429, used=int(used), limit=s.translate_daily_chars_per_user)


def _allowed(private: bool) -> list:
    """Private content goes to the local engine only; with none configured it is refused, never sent away."""
    ps = providers.configured()
    return [p for p in ps if p.name == "local"] if private else ps


def _chunks(order: list[int], masked: list[str]) -> list[list[int]]:
    out: list[list[int]] = []
    cur: list[int] = []
    n = 0
    for i in order:
        if cur and (len(cur) >= MAX_ITEMS_CALL or n + len(masked[i]) > MAX_CHARS_CALL):
            out.append(cur)
            cur, n = [], 0
        cur.append(i)
        n += len(masked[i])
    if cur:
        out.append(cur)
    return out


def _run(conn: Connection, bodies: list[str], source: str | None, target: str, terms: tuple[str, ...],
         user_id: str, private: bool) -> tuple[list[str | None], list[str]]:
    """Translate every body. One result per body (None where nothing usable came back) and which provider
    served each one. Caching is the caller's job: this only moves text out and brings text back."""
    masked: list[str] = []
    slots: list[list[str]] = []
    for body in bodies:
        m, sl = protect(body, terms)
        masked.append(m)
        slots.append(sl)

    results: list[str | None] = [None] * len(bodies)
    served: list[str] = [""] * len(bodies)
    allowed = _allowed(private)

    for chunk in _chunks(list(range(len(bodies))), masked):
        sent = [masked[i] for i in chunk]
        pending = sum(len(t) for t in sent)
        for p in allowed:
            if not _room(conn, p.name, pending):
                continue
            try:
                got = _call(p, sent, source, target)
            except ProviderError:
                continue
            _charge(conn, p.name, user_id, pending)
            for pos, i in enumerate(chunk):
                if _intact(got[pos], len(slots[i])):      # a lost marker means a broken link: keep the original
                    results[i] = restore(got[pos], slots[i])
                    served[i] = p.name
            break
    return results, served


# --------------------------------------------------------------------------- reading and writing the cache
def _cached(conn: Connection, x: dict, target: str) -> str | None:
    row = conn.execute(
        text(
            "select text from translations where content_type = :t and content_id = :i and content_version = :v "
            "and source_lang = :s and target_lang = :g and status = 'ok'"
        ),
        {"t": x["kind"], "i": x["id"], "v": x["version"], "s": x["source_lang"], "g": target},
    ).first()
    return row.text if row else None


def _store(conn: Connection, x: dict, target: str, body: str, provider: str) -> None:
    # Everything older than this version is stale from now on: never served as current, re-translated next time.
    conn.execute(
        text("update translations set status = 'stale' where content_type = :t and content_id = :i and content_version < :v"),
        {"t": x["kind"], "i": x["id"], "v": x["version"]},
    )
    conn.execute(
        text(
            "insert into translations (content_type, content_id, content_version, source_lang, target_lang, text, provider, status) "
            "values (:t, :i, :v, :s, :g, :x, :p, 'ok') "
            "on conflict (content_type, content_id, content_version, source_lang, target_lang) "
            "do update set text = excluded.text, provider = excluded.provider, status = 'ok', created_at = now()"
        ),
        {"t": x["kind"], "i": x["id"], "v": x["version"], "s": x["source_lang"], "g": target, "x": body, "p": provider},
    )


def bump_version(conn: Connection, kind: str, content_id: str) -> int:
    """THE EDIT HOOK: call this whenever the original changes. The version goes up, so every translation
    already cached for it becomes stale and none of them is served again - the next request re-translates.
    There is no edit endpoint yet; this is what those will call."""
    k = KINDS.get(kind)
    if k is None:
        raise TranslateError("bad_type", 422, type=str(kind)[:40])
    row = conn.execute(text(f"update {k.table} set version = version + 1 where id = :i returning version"), {"i": content_id}).first()
    if row is None:
        raise TranslateError("not_found", 404)
    conn.execute(
        text("update translations set status = 'stale' where content_type = :t and content_id = :i and content_version < :v"),
        {"t": kind, "i": content_id, "v": row.version},
    )
    return int(row.version)


def _answer(x: dict, target: str, body: str, status: str, cached: bool) -> dict:
    return {"id": x["id"], "field": x["field"], "source_lang": x["source_lang"], "target_lang": target,
            "text": body, "status": status, "cached": cached}


def _remember(conn: Connection, x: dict, lang: str) -> None:
    x["source_lang"] = lang
    k = KINDS[x["kind"]]
    conn.execute(text(f"update {k.table} set source_lang = :s where id = :i"), {"s": lang, "i": x["id"]})


def _finish(conn: Connection, group: list[dict], source: str, target: str, user_id: str,
            private: bool) -> list[dict]:
    """One source language, one run: cache first, then the providers, then the cache again. The answer list
    comes back in `group` order, one per item, so the caller can zip it against the items."""
    answers: list[dict | None] = [None] * len(group)
    work: list[tuple[int, dict]] = []
    seen: dict[tuple[str, str, str], int] = {}   # the same item asked for twice is translated once
    dups: list[tuple[int, int]] = []             # (the repeat, the one we actually translated)
    for pos, x in enumerate(group):
        if not x["value"].strip():
            answers[pos] = _answer(x, target, x["value"], "original", False)
        elif source == target:
            answers[pos] = _answer(x, target, x["value"], "original", False)
        else:
            hit = _cached(conn, x, target)
            if hit is not None:
                answers[pos] = _answer(x, target, hit, "ok", True)
            else:
                key = (x["kind"], x["id"], x["field"])
                if key in seen:
                    dups.append((pos, seen[key]))
                else:
                    seen[key] = pos
                    work.append((pos, x))

    # Private content: with no local engine there is nowhere it may go, so it is refused by name rather
    # than quietly handed to a third party or reported as an outage.
    if work and private and not any(p.name == "local" for p in providers.configured()):
        for pos, x in work:
            answers[pos] = _answer(x, target, x["value"], "private", False)
        for repeat, first in dups:
            answers[repeat] = answers[first]
        return [a for a in answers if a is not None]

    if work:
        keep = {t for t, _ in _glossary(conn, source)}
        keep |= set(_names(conn, sorted({x["community_id"] for _, x in work})))
        terms = tuple(sorted(keep - {""}))
        force = [(t, r) for t, r in _glossary(conn, source) if r]

        bodies = ["".join(split(x["value"])) for _, x in work]
        _user_room(conn, user_id, sum(len(b) for b in bodies))
        results, served = _run(conn, bodies, source, target, terms, user_id, private)

        for (pos, x), name, got in zip(work, served, results):
            if got is None:
                answers[pos] = _answer(x, target, x["value"], "unavailable", False)
                continue
            for term, replacement in force:        # forced terms: the form the owner asked for wins
                got = got.replace(term, replacement)
            _store(conn, x, target, got, name or "unknown")
            answers[pos] = _answer(x, target, got, "ok", False)

    for repeat, first in dups:
        answers[repeat] = answers[first]
    return [a for a in answers if a is not None]


def batch(conn: Connection, user_id: str, items: list[dict], target: str) -> list[dict]:
    if len(items) > MAX_BATCH:
        raise TranslateError("too_many", 422, max=MAX_BATCH)
    loaded = [_load(conn, user_id, str(i.get("type")), str(i.get("id")), str(i.get("field"))) for i in items]

    # Where did this text come from? The author's own word, or one detection call for everything that
    # arrived without one, remembered on the original so it is only ever asked once.
    unknown = [x for x in loaded if not x["source_lang"]]
    if unknown:
        found = _detect([x["value"] for x in unknown])
        if found:
            for x, lang in zip(unknown, found):
                if lang:
                    _remember(conn, x, lang)

    answers: dict[tuple[str, str, str], dict] = {}
    groups: dict[str, list[dict]] = {}
    for x in loaded:
        key = (x["kind"], x["id"], x["field"])
        if not x["source_lang"]:
            answers[key] = _answer(x, target, x["value"], "unavailable", False)
        else:
            groups.setdefault(x["source_lang"], []).append(x)

    # One run per source language (the cache key and the glossary both depend on it), then the caller's own
    # order - matched on the item, not on the answer, so two fields of one row stay two answers.
    for source, group in groups.items():
        private = any(KINDS[x["kind"]].private for x in group)
        for x, ans in zip(group, _finish(conn, group, source, target, user_id, private)):
            answers[(x["kind"], x["id"], x["field"])] = ans
    return [answers[(str(i.get("type")), str(i.get("id")), str(i.get("field")))] for i in items]


def draft(conn: Connection, user_id: str, body: str, target: str, source: str | None) -> dict:
    """Free text the person has not saved yet (a draft preview). Same protections, counted against their
    day, and never written anywhere."""
    body = body[:MAX_TEXT]
    if source is None:
        found = _detect([body])
        source = found[0] if found and found[0] else None
    base = {"id": None, "field": None, "source_lang": source, "target_lang": target}
    if not body.strip() or source is None or source == target:
        # Nothing to ask for: empty, already in the reader's language, or no detector could place it.
        status = "original" if not body.strip() or source == target else "unavailable"
        return {**base, "text": body, "status": status, "cached": False}

    parts = split(body)
    terms = tuple(sorted({t for t, _ in _glossary(conn, source)}))
    _user_room(conn, user_id, sum(len(p) for p in parts))
    results, _served = _run(conn, parts, source, target, terms, user_id, False)
    if any(r is None for r in results):
        return {**base, "text": body, "status": "unavailable", "cached": False}
    got = "".join(results)  # type: ignore[arg-type]
    for term, replacement in _glossary(conn, source):
        if replacement:
            got = got.replace(term, replacement)
    return {**base, "text": got, "status": "ok", "cached": False}


# --------------------------------------------------------------------------- the person's own preference
def preferences(conn: Connection, user_id: str) -> dict:
    row = conn.execute(
        text("select translate_auto, translate_target, language from users where id = :u and status = 'active'"),
        {"u": user_id},
    ).first()
    if row is None:
        raise TranslateError("unauthorized", 401)
    return {"auto": bool(row.translate_auto), "target": row.translate_target or row.language}


def set_preferences(conn: Connection, user_id: str, fields: dict) -> dict:
    columns = {"auto": "translate_auto", "target": "translate_target"}
    sets = {columns[k]: v for k, v in fields.items() if k in columns and v is not None}
    if sets:
        assignments = ", ".join(f"{c} = :{c}" for c in sets)
        conn.execute(text(f"update users set {assignments}, updated_at = now() where id = :u"), {**sets, "u": user_id})
    return preferences(conn, user_id)
