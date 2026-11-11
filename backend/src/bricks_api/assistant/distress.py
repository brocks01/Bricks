"""Words that mean "I need help" (distress.json): checked before the model.

Every channel runs this first on what the member said or typed. A match goes
straight to SOS; the model is never asked. Every language is checked whatever the
member's language, because people switch languages under stress.
"""

import json
import re
import unicodedata
from functools import cache
from pathlib import Path

from ..schemas import Language

DISTRESS_FILE = Path(__file__).with_name("distress.json")
_LATIN = re.compile(r"^[a-z0-9 .'-]+$")


def normalise(text: str) -> str:
    """Lower case, one kind of apostrophe, single spaces (speech-to-text varies)."""
    text = unicodedata.normalize("NFC", text).lower()
    for curly in ("\N{RIGHT SINGLE QUOTATION MARK}", "\N{LEFT SINGLE QUOTATION MARK}", "`"):
        text = text.replace(curly, "'")
    return re.sub(r"\s+", " ", text).strip()


@cache
def phrases() -> dict[Language, tuple[str, ...]]:
    data = json.loads(DISTRESS_FILE.read_text(encoding="utf-8"))
    return {lang: tuple(normalise(p) for p in words) for lang, words in data["phrases"].items()}


@cache
def _patterns() -> tuple[tuple[str, re.Pattern[str] | None], ...]:
    out: list[tuple[str, re.Pattern[str] | None]] = []
    for words in phrases().values():
        for phrase in words:
            if _LATIN.match(phrase):
                # Whole words, so "helpful" or "painting" don't match.
                out.append((phrase, re.compile(rf"(?<![a-z]){re.escape(phrase)}(?![a-z])")))
            else:
                out.append((phrase, None))
    return tuple(out)


def match_distress(text: str) -> str | None:
    """The distress phrase found in what they said, or None."""
    said = normalise(text)
    if not said:
        return None
    for phrase, pattern in _patterns():
        if pattern.search(said) if pattern else phrase in said:
            return phrase
    return None


def is_distress(text: str) -> bool:
    return match_distress(text) is not None
