"""The languages a person may SPEAK to the agent (up to 23), separate from the six the app is translated into (en hi bn ta zh ms).
The voice agent is told this list so it only guesses among them, and asks the person to repeat when speech is unclear."""

# code -> (English name, own name). Codes follow ISO 639 where one exists; "bho", "mai", "kok", "yue", "nan", "teo" are three-letter codes.
SPOKEN: dict[str, tuple[str, str]] = {
    "en": ("English", "English"), "hi": ("Hindi", "हिन्दी"), "bn": ("Bengali", "বাংলা"), "ta": ("Tamil", "தமிழ்"),
    "te": ("Telugu", "తెలుగు"), "mr": ("Marathi", "मराठी"), "gu": ("Gujarati", "ગુજરાતી"), "kn": ("Kannada", "ಕನ್ನಡ"),
    "ml": ("Malayalam", "മലയാളം"), "pa": ("Punjabi", "ਪੰਜਾਬੀ"), "ur": ("Urdu", "اردو"), "or": ("Odia", "ଓଡ଼ିଆ"),
    "as": ("Assamese", "অসমীয়া"), "bho": ("Bhojpuri", "भोजपुरी"), "mai": ("Maithili", "मैथिली"), "ne": ("Nepali", "नेपाली"),
    "kok": ("Konkani", "कोंकणी"), "zh": ("Mandarin", "中文"), "yue": ("Cantonese", "粵語"), "nan": ("Hokkien", "閩南語"),
    "teo": ("Teochew", "潮州话"), "ms": ("Malay", "Bahasa Melayu"), "id": ("Indonesian", "Bahasa Indonesia"),
}
MAX_SPOKEN = len(SPOKEN)


def clean(codes) -> list[str]:
    """Keep only known codes, once each, in the order given."""
    seen: list[str] = []
    for c in codes or []:
        c = str(c).strip().lower()
        if c in SPOKEN and c not in seen:
            seen.append(c)
    return seen


def names(codes: list[str]) -> str:
    return ", ".join(SPOKEN[c][0] for c in codes if c in SPOKEN)


def rules(spoken: list[str] | None, main: str | None, app_language: str | None = None) -> str:
    """The language rules for the agent's prompt. Empty when the person has not said which languages they speak."""
    spoken = clean(spoken)
    if not spoken:
        return ""
    main = main if main in spoken else spoken[0]
    app = f" The app itself is set to {SPOKEN[app_language][0]}; that is the screen language, not the language to talk in, so do not change it unless they ask." if app_language in SPOKEN else ""
    return (
        f"LANGUAGES. The person speaks only these: {names(spoken)}. Their main language for talking is {SPOKEN[main][0]}: open in it and use it whenever you are unsure.{app} "
        "Answer in the language they just used, but only if it is one of theirs. A phone line, noise or an accent often makes speech recognition mistake one language for another: "
        "if what you heard is unclear, broken, or looks like a language that is NOT on their list, do not guess and do not answer a guess. "
        f"Say, in {SPOKEN[main][0]} and in one short gentle sentence, that you did not catch it and ask them to say it again. "
        "If you cannot tell which of their languages they used, ask the same way. Never move to a language outside their list unless they clearly ask you to."
    )
