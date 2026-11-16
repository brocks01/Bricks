"""Pure rules about phone numbers and what a call may say. No database, no clock, no network."""
import re

E164 = re.compile(r"^\+[1-9]\d{7,14}$")

# Languages a call may open in: code -> name the model is told to speak.
LANGUAGES = {
    "auto": "the language the person speaks",
    "en-IN": "English (Indian accent)",
    "en-SG": "English (Singapore)",
    "hi-IN": "Hindi",
    "te-IN": "Telugu",
    "kn-IN": "Kannada",
    "mr-IN": "Marathi",
    "ta-IN": "Tamil",
    "bn-IN": "Bengali",
    "zh-CN": "Mandarin Chinese",
    "ms-MY": "Malay",
}

MAX_BRIEF = 4000


def normalize_number(s) -> str:
    return re.sub(r"[\s\-().]", "", str(s or ""))


def is_e164(s) -> bool:
    return bool(E164.match(normalize_number(s)))


def mask(number) -> str:
    """+919876543210 -> +91*******210: enough to recognise a number in a log, not enough to dial it."""
    n = normalize_number(number)
    if len(n) <= 6:
        return "***"
    return n[:3] + "*" * (len(n) - 6) + n[-3:]


def is_allowed(number, allowed: list[str]) -> bool:
    n = normalize_number(number)
    return any(normalize_number(a) == n for a in allowed)


def clean_name(s) -> str:
    """A first name for the greeting: letters, spaces, dots, apostrophes and hyphens only, at most 40."""
    s = re.sub(r"[^\w .'\-]|[\d_]", "", str(s or ""), flags=re.UNICODE)
    return re.sub(r"\s+", " ", s).strip()[:40]


def build_system_prompt(language: str, brief: str, name: str, tool_hints: list[str]) -> str:
    """Our safety frame first, then the language and the way to talk, then the brief (which cannot remove the frame)."""
    who = clean_name(name)
    if language == "auto":
        start = ("Open in the language the person seems most likely to speak (English if you are unsure). From then on speak whatever language "
                 "the person speaks to you, and switch whenever they switch: Hindi, English, Telugu, Kannada, Marathi, Tamil, Bengali, a mix of two, anything.")
    else:
        start = f"Open in {LANGUAGES.get(language, LANGUAGES['en-IN'])}. If the person then speaks another language, switch to it and stay with them."
    greeting = (
        f'The person\'s name is {who}. Start your very first turn with "Hii {who}!" and use their name now and then, the way a friend would.'
        if who
        else 'Start your very first turn with a warm "Hii!".'
    )
    lines = [
        "You are speaking on a live telephone call, in a technology test. The person chose to take this call.",
        start,
        "Keep your turns short and easy to hear on a poor line (usually one to three sentences), but give a fuller answer when the person asks you to explain something.",
        greeting,
        "Talk like a friendly person on an ordinary call: relaxed, warm, natural, with short everyday words. You can talk about anything: answer questions, chat, think things through with the person. Follow the conversation wherever it goes, like a normal chat: react to what they say and ask at most one easy question at a time. Do not steer them towards any topic of your own.",
        "In your first turn, casually and in a few words, say that your name is Ken and that you are an AI voice assistant. Never pretend to be a person.",
        "For medical, legal, financial or pesticide questions give only general information, never a diagnosis or a dose, and say that a qualified person should confirm.",
        "Never end or cut a call short while the person still wants to talk.",
    ]
    if tool_hints:
        lines += ["", "Tools and controls you can use during this call:", *tool_hints]
    default_brief = "Just have a normal friendly chat: ask how their day is going and talk about whatever they like."
    lines += ["", "Brief for this call:", str(brief or "").strip()[:MAX_BRIEF] or default_brief]
    return "\n".join(lines)
