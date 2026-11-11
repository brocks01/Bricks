"""Messages in and out, the same for both providers."""

from dataclasses import dataclass, field
from typing import Literal

Route = Literal["meta", "twilio"]
InboundKind = Literal["text", "button", "list", "audio", "location", "other"]


@dataclass(frozen=True)
class Inbound:
    """One message from a member. `payload` is a button or list row id."""

    id: str
    phone: str  # E.164
    route: Route
    kind: InboundKind
    text: str = ""
    payload: str = ""
    media_id: str = ""  # Meta media id, or Twilio media URL
    media_type: str = ""
    lat: float | None = None
    lng: float | None = None
    profile_name: str = ""


@dataclass(frozen=True)
class Choice:
    """A reply button or list row. Button titles are at most 20 characters."""

    id: str
    title: str
    description: str = ""


@dataclass(frozen=True)
class Text:
    body: str


@dataclass(frozen=True)
class Buttons:
    body: str
    choices: list[Choice]  # 1-3


@dataclass(frozen=True)
class ListMenu:
    body: str
    button: str  # the label that opens the list, at most 20 characters
    choices: list[Choice]  # 1-10


@dataclass(frozen=True)
class LocationRequest:
    body: str
    fallback: str  # Twilio has no location button: how to share it by hand


@dataclass(frozen=True)
class Template:
    """An approved Meta template. `fallback` is sent instead inside the 24-hour window
    and on Twilio (which can't use our Meta templates)."""

    name: str
    language: str  # our code: en, ms, zh, ta
    params: list[str]
    payloads: list[str]  # one per quick-reply button, in order
    fallback: Buttons | Text
    header_image: str | None = None


Outbound = Text | Buttons | ListMenu | LocationRequest | Template


@dataclass
class SendResult:
    ok: bool
    provider_id: str | None = None
    error: str | None = None
    kind: str = ""
    extra: dict[str, str] = field(default_factory=dict)


def normalize_phone(raw: str) -> str:
    """ "whatsapp:+65 9123 4567" / "6591234567" -> "+6591234567"."""
    digits = "".join(c for c in raw.removeprefix("whatsapp:") if c.isdigit())
    return f"+{digits}"
