"""POST /assistant/turn: one thing the member said, and Buddy's answer.

Shared contract (voice iteration 0.2, response agreed with the app track). The app's
copy is AssistantTurn / UiAction in app/src/api/types.ts: change both together.

A turn carries either recorded speech (audio) or words (text, from WhatsApp or the
phone's own recogniser). To say "yes" to a confirmation the app sends the same tool
and args back in `confirm`, so a change never depends on the model hearing "yes".

Show, don't tell (agreed at 0.2 review): every command visibly changes the screen. The
app sends the form on screen (`screen_fields`); Buddy answers with steps the app plays
out (open the screen, fill each field, point at it, then ask for the Yes).
"""

from typing import Annotated, Any, Literal

from pydantic import Field, model_validator

from ..schemas import ChannelPref, Input, Language, Wire
from .tools import Platform


class ScreenField(Input):
    """One field of the form on screen and what it holds now (typed by hand or by Buddy)."""

    id: Annotated[str, Field(max_length=60)]
    label: Annotated[str, Field(max_length=120)]
    kind: Literal["text", "choice", "date", "time", "number"]
    value: Annotated[str, Field(max_length=500)] | None = None
    # For a choice: the option ids it can take.
    options: Annotated[list[str], Field(max_length=30)] | None = None


class ConfirmAnswer(Input):
    tool: str
    args: dict[str, Any]
    answer: Literal["yes", "no"]


class TurnIn(Input):
    """What the member said, and where."""

    language: Language
    channel: ChannelPref = "app"
    # Exactly one of these: base64 audio (m4a / ogg / wav) or the words themselves.
    audio: str | None = None
    audio_mime: str | None = None
    text: Annotated[str, Field(max_length=1000)] | None = None
    # App only: the screen they're on and what it says (its Read It Out script).
    screen: str | None = None
    screen_script: Annotated[str, Field(max_length=4000)] | None = None
    # App only: the form on screen, so Buddy fills what's empty and keeps what they typed.
    screen_fields: Annotated[list[ScreenField], Field(max_length=30)] | None = None
    platform: Platform | None = None
    # The answer to a confirmation Buddy asked for (Yes / No buttons or "yes").
    confirm: ConfirmAnswer | None = None
    # Keeps a few turns of context together (a call, or one Buddy conversation).
    conversation_id: str | None = None

    @model_validator(mode="after")
    def _something_said(self) -> "TurnIn":
        said = [x for x in (self.audio, self.text) if x]
        if self.confirm is None and len(said) != 1:
            raise ValueError("send exactly one of audio or text (or a confirm answer)")
        return self


class ConfirmAction(Wire):
    """Ask before a change: show Yes / No; Yes sends `confirm` back with these."""

    type: Literal["confirm"] = "confirm"
    tool: str
    args: dict[str, Any]
    summary: str


class NavigateAction(Wire):
    type: Literal["navigate"] = "navigate"
    screen: str
    id: str | None = None


class HighlightAction(Wire):
    """Scroll to and point at something on screen (e.g. the event card it means)."""

    type: Literal["highlight"] = "highlight"
    target: str


class FillAction(Wire):
    """Put a value into a field on screen, visibly: scroll to it, type or pick it, glow.

    `target` is a ScreenField id; `value` is the text, the option id (choice), YYYY-MM-DD
    (date), HH:MM (time) or a number. A fill saves nothing: saving still needs a Yes.
    """

    type: Literal["fill"] = "fill"
    target: str
    value: str


class StartWalkAction(Wire):
    type: Literal["start_walk"] = "start_walk"


class FinishWalkAction(Wire):
    type: Literal["finish_walk"] = "finish_walk"


class StartWarmupAction(Wire):
    type: Literal["start_warmup"] = "start_warmup"
    exercise: str | None = None


class OpenSosAction(Wire):
    """Straight to the SOS screen (its countdown lets them cancel a false alarm)."""

    type: Literal["open_sos"] = "open_sos"
    reason: str | None = None


class Choice(Wire):
    label: str
    # What to send as the next turn's text when they tap it.
    say: str


class ChoicesAction(Wire):
    """Not understood twice: 2-3 big buttons of what Buddy can do."""

    type: Literal["choices"] = "choices"
    options: Annotated[list[Choice], Field(min_length=2, max_length=3)]


UiAction = Annotated[
    ConfirmAction
    | NavigateAction
    | HighlightAction
    | FillAction
    | StartWalkAction
    | FinishWalkAction
    | StartWarmupAction
    | OpenSosAction
    | ChoicesAction,
    Field(discriminator="type"),
]


class TurnOut(Wire):
    """Buddy's answer: words (and their audio) plus what the app should do."""

    transcript: str
    reply_text: str
    # Null when the phone should read reply_text with its own voice.
    reply_audio_url: str | None
    # Played in order, one visible step at a time (open the screen, fill, point, ask).
    # Show, don't tell: anything Buddy does must show on screen.
    ui_actions: list[UiAction]
    # False while Buddy is waiting for an answer (a confirmation or a choice).
    done: bool
    conversation_id: str | None = None
