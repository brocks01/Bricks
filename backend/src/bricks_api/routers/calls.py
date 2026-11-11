"""Phone call webhooks (Tier 1: TwiML). Voice 0.1: the hello-world greeting.

Later: /voice/turn (the call loop on Buddy's brain, 2.1), /voice/outbound/{type} and
/voice/status (2.2).
"""

import logging

from fastapi import APIRouter, Request, Response
from twilio.twiml.voice_response import VoiceResponse

from ..calls.audio import LANGS, VOICES, audio_url, has_audio
from ..calls.prompts import segment
from ..calls.security import TwilioForm
from ..config import Settings
from ..schemas import Language

log = logging.getLogger("bricks.calls")
router = APIRouter(prefix="/voice", tags=["calls"])


def twiml(r: VoiceResponse) -> Response:
    return Response(content=str(r), media_type="application/xml")


def speak(
    r: VoiceResponse, settings: Settings, prompt_id: str, lang: Language, **slots: str
) -> None:
    """Say one prompt segment (`"checkin.ask"`). A fixed one plays its pre-generated MP3
    if there is one; anything else is <Say>-ed live in that language."""
    seg = segment(prompt_id, lang)
    if seg.fixed and has_audio(prompt_id, lang):
        r.play(audio_url(settings.public_base_url, prompt_id, lang))
    else:
        v = VOICES[lang]
        r.say(seg.fill(**slots), voice=v.say_voice, language=v.say_language)


@router.post("/incoming")
async def incoming(request: Request, form: TwilioForm) -> Response:
    # The call id only: never phone numbers in logs.
    log.info("calls.incoming call_sid=%s", form.get("CallSid"))
    r = VoiceResponse()
    for lang in LANGS:
        speak(r, request.app.state.settings, "hello.say", lang)
        r.pause(length=1)
    r.hangup()
    return twiml(r)
