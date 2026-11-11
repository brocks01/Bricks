"""Speech: what was said in a recording, and cloud voices for phones without one.

No speech provider is wired yet (Gemini/Google Cloud keys come with the voice
lane, docs/05). Until then both answer 503, which the app already handles: it
offers "tap what you said" phrases and uses the phone's own voice.
"""

from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..deps import CtxDep
from ..schemas import Language, TtsIn

router = APIRouter(tags=["voice"])

NO_SPEECH = "No speech service yet."


@router.post("/assistant/transcribe")
async def transcribe(
    ctx: CtxDep,
    audio: Annotated[UploadFile, File()],
    language: Annotated[Language, Form()],
) -> None:
    raise HTTPException(503, NO_SPEECH)


@router.post("/tts")
async def tts(body: TtsIn, ctx: CtxDep) -> None:
    raise HTTPException(503, NO_SPEECH)
