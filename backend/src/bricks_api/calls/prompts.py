"""The fixed things a call says, in four languages: `calls/prompts/<name>.<lang>.txt`.

Each file holds short sections::

    # checkin: what this prompt is for
    [ask]
    Did you move yesterday? Say yes or no.

    [no]
    There's a walk at {time} near {place}, with {count} going. Want to join?

A section without `{slots}` is **fixed**: pre-generated as an MP3 once (`gen_audio`) and
played on every call. A section with slots is **dynamic**: filled in and spoken live.
Prompts are split so the most is fixed. Slot values arrive already in the member's
language (times, places, names).
"""

import re
from dataclasses import dataclass
from functools import cache
from pathlib import Path

from ..schemas import Language

PROMPT_DIR = Path(__file__).resolve().parent / "prompts"
LANGS: tuple[Language, ...] = ("en", "ms", "zh", "ta")

SLOT = re.compile(r"\{(\w+)\}")
SECTION = re.compile(r"^\[(\w+)\]$")


@dataclass(frozen=True)
class Segment:
    text: str

    @property
    def slots(self) -> frozenset[str]:
        return frozenset(SLOT.findall(self.text))

    @property
    def fixed(self) -> bool:
        return not self.slots

    def fill(self, **values: str) -> str:
        missing = self.slots - values.keys()
        if missing:
            raise KeyError(f"missing slots: {sorted(missing)}")
        return SLOT.sub(lambda m: values[m.group(1)], self.text)


def parse(text: str) -> dict[str, Segment]:
    sections: dict[str, list[str]] = {}
    current: list[str] | None = None
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if m := SECTION.match(line):
            current = sections.setdefault(m.group(1), [])
        elif current is None:
            raise ValueError(f"text before the first [section]: {line!r}")
        else:
            current.append(line)
    return {name: Segment(" ".join(lines)) for name, lines in sections.items()}


@cache
def prompt_names() -> tuple[str, ...]:
    return tuple(sorted({p.name.split(".")[0] for p in PROMPT_DIR.glob("*.txt")}))


@cache
def load(name: str, lang: Language) -> dict[str, Segment]:
    return parse((PROMPT_DIR / f"{name}.{lang}.txt").read_text(encoding="utf-8"))


def segment(prompt_id: str, lang: Language) -> Segment:
    """`"checkin.ask"` → that section in that language."""
    name, section = prompt_id.split(".", 1)
    return load(name, lang)[section]


def fixed_ids() -> list[str]:
    """Every pre-generable segment id (`name.section`), taken from the English files."""
    return [
        f"{name}.{section}"
        for name in prompt_names()
        for section, seg in load(name, "en").items()
        if seg.fixed
    ]
