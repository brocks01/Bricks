"""WhatsApp pieces that need no database: keywords, templates, Meta's wire format."""

import json

from bricks_api.whatsapp import keywords, templates
from bricks_api.whatsapp.models import Buttons, Choice
from bricks_api.whatsapp.providers import Meta
from bricks_api.whatsapp.templates import DEFS, FOOTER

from .test_whatsapp import meta_body


def test_sos_words_are_deterministic() -> None:
    for word in ("HELP", "help!", "Tolong", "救命", "உதவி", "I fell in the toilet", "saya jatuh"):
        assert keywords.is_sos(word), word
    for word in ("tolong ingatkan saya makan ubat", "any walks tomorrow?", "helpful"):
        assert not keywords.is_sos(word), word


def test_areas_match_typos_and_chinese_names() -> None:
    assert keywords.match_area("toa payoh") == ("Toa Payoh", True)
    assert keywords.match_area("大巴窑") == ("Toa Payoh", True)
    assert keywords.match_area("I stay at Bishan St 22") == ("Bishan", True)
    assert keywords.match_area("Tampinez") == ("Tampines", False)
    assert keywords.match_area("Mars") == (None, False)


def test_templates_follow_metas_rules() -> None:
    assert len(DEFS) == 11
    for name, d in DEFS.items():
        for lang in ("en", "ms", "zh", "ta"):
            text_ = d.body[lang]
            assert text_.count("{{") == len(d.params), (name, lang)
            # Meta ignores formatting: no variable first or last.
            bare = text_.strip("*_ ")
            assert not bare.startswith("{{") and not bare.rstrip(".?").endswith("}}"), (name, lang)
            assert all(len(b) <= 20 for b in d.buttons[lang]), (name, lang, d.buttons[lang])
            assert len(d.buttons[lang]) == len(d.buttons["en"]) <= 3
            assert "🙂" not in text_
        assert len(d.examples) == len(d.params)
    assert all(len(f) <= 60 for f in FOOTER.values())


def test_meta_template_request_carries_button_payloads() -> None:
    msg = templates.build("daily_checkin", "zh", ["Raj"], ["checkin:yes:d", "checkin:no:d"])
    req = Meta.body("+6591234567", msg)
    assert req["to"] == "6591234567" and req["type"] == "template"
    tpl = req["template"]
    assert tpl["name"] == "daily_checkin" and tpl["language"] == {"code": "zh_CN"}
    assert tpl["components"][0] == {"type": "body", "parameters": [{"type": "text", "text": "Raj"}]}
    assert tpl["components"][2]["parameters"] == [{"type": "payload", "payload": "checkin:no:d"}]
    buttons = Meta.body("+65", Buttons("Hi", [Choice("a", "A very long button title")]))
    assert (
        buttons["interactive"]["action"]["buttons"][0]["reply"]["title"] == "A very long button t"
    )


def test_meta_parses_template_button_taps_and_voice_notes() -> None:
    payload = json.loads(
        meta_body(
            "+6591234567", {"type": "button", "button": {"payload": "checkin:no:d", "text": "No"}}
        )
    )
    [tapped] = Meta.parse(payload)
    assert (tapped.kind, tapped.payload, tapped.phone) == ("button", "checkin:no:d", "+6591234567")
    payload = json.loads(
        meta_body("+6591234567", {"type": "audio", "audio": {"id": "M1", "mime_type": "audio/ogg"}})
    )
    [voice] = Meta.parse(payload)
    assert (voice.kind, voice.media_id) == ("audio", "M1")
