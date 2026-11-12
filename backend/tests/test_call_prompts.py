"""Voice 1.2: every fixed call prompt exists in four languages and is safe to speak."""

import re

import pytest

from bricks_api.calls.prompts import (
    LANGS,
    PROMPT_DIR,
    SLOT,
    fixed_ids,
    load,
    parse,
    prompt_names,
    segment,
)

# The prompts the call flows need (iteration 1.2 table).
EXPECTED = {
    "hello",
    "inbound_welcome_known",
    "inbound_welcome_unknown",
    "checkin",
    "reminder",
    "event_reminder",
    "are_you_ok",
    "sos_helper",
    "family_alert",
    "sos_confirm",
    "still_there",
    "goodbye",
    "dtmf_hint",
    # Voice 1.3: the call loop.
    "menu_keys",
    "anything_else",
    "not_understood",
    "not_linked",
}
SENTENCE_END = re.compile("[.!?" + chr(0x3002) + chr(0xFF01) + chr(0xFF1F) + "]+")  # + Chinese
# Things speech engines read badly or letter by letter.
BAD_FOR_SPEECH = re.compile(r"[/&%#*@<>_~|]|\bkm\b|\bmin\b|\.\.\.|…")
EMOJI = re.compile("[\U0001f000-\U0001faff☀-➿]")
ALL = [(name, lang) for name in sorted(EXPECTED) for lang in LANGS]


def sentences(text: str) -> int:
    return len([s for s in SENTENCE_END.split(text) if s.strip()])


def test_every_prompt_is_there_in_four_languages() -> None:
    assert set(prompt_names()) == EXPECTED
    for name in EXPECTED:
        for lang in LANGS:
            assert (PROMPT_DIR / f"{name}.{lang}.txt").is_file(), f"{name}.{lang}"


@pytest.mark.parametrize("name", sorted(EXPECTED))
def test_languages_have_the_same_sections_and_slots(name: str) -> None:
    en = load(name, "en")
    for lang in LANGS:
        other = load(name, lang)
        assert list(other) == list(en), f"{name}.{lang} sections"
        for section, seg in en.items():
            assert other[section].slots == seg.slots, f"{name}.{section}.{lang} slots"


@pytest.mark.parametrize(("name", "lang"), ALL)
def test_t1_short_and_safe_to_speak(name: str, lang: str) -> None:
    for section, seg in load(name, lang).items():
        where = f"{name}.{section}.{lang}"
        assert seg.text, where
        spoken = SLOT.sub("Tan", seg.text)  # slot names themselves are never spoken
        assert sentences(spoken) <= 2, where
        assert not BAD_FOR_SPEECH.search(spoken), where
        assert not EMOJI.search(spoken), where
        # "995" is read "nine hundred and ninety-five": always digit by digit.
        assert "995" not in spoken, where


def test_t2_a_long_tamil_name_still_fits() -> None:
    long_name = "திருமதி கல்யாணசுந்தரம் வேலாயுதம் பார்வதி"
    for name in EXPECTED:
        for section, seg in load(name, "ta").items():
            values = {slot: long_name for slot in seg.slots}
            assert sentences(seg.fill(**values)) <= 2, f"{name}.{section}"


def test_fixed_segments_are_pregenerated_and_dynamic_ones_spoken_live() -> None:
    ids = fixed_ids()
    assert "hello.say" in ids and "checkin.ask" in ids and "sos_confirm.say" in ids
    assert "checkin.greet" not in ids  # has {name}
    for prompt_id in ids:
        for lang in LANGS:
            assert segment(prompt_id, lang).fixed, f"{prompt_id}.{lang}"


def test_filling_slots() -> None:
    seg = segment("reminder.say", "en")
    assert seg.fill(name="Mdm Tan", text="take your medicine") == (
        "Hi Mdm Tan, a reminder: take your medicine."
    )
    with pytest.raises(KeyError):
        seg.fill(name="Mdm Tan")


def test_file_format() -> None:
    parsed = parse("# comment\n\n[ask]\nLine one.\nLine two.\n\n[yes]\nGood.\n")
    assert parsed["ask"].text == "Line one. Line two."
    assert list(parsed) == ["ask", "yes"]
    with pytest.raises(ValueError):
        parse("No section header.\n")
