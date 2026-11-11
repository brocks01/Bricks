"""What the translation API accepts and answers.

The language types are built from `providers.LANGS` / `providers.OFFERED`, so adding a language in one place
moves both: the six the app offers, plus te and mr which the owner may offer later. Anything else is a 422
from here, before a provider is woken up."""
import uuid
from typing import Literal

from pydantic import BaseModel, Field

from .providers import LANGS, OFFERED

Lang = Literal[tuple(LANGS)]       # accepted: the six offered plus te and mr
Offered = Literal[tuple(OFFERED)]  # what a menu may show


class BatchItem(BaseModel):
    type: str = Field(max_length=40)      # checked against service.KINDS: unknown -> 422
    id: uuid.UUID
    field: str = Field(max_length=40)     # checked against the kind's own columns: unknown -> 422


class BatchIn(BaseModel):
    items: list[BatchItem] = Field(min_length=1, max_length=50)
    target: Lang


class TextIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    target: Lang
    source: Lang | None = None            # the client may say where it came from; otherwise we detect


class MeIn(BaseModel):
    auto: bool | None = None              # auto-translate on read; on by default
    target: Lang | None = None            # null = follow the person's UI language


class TranslationOut(BaseModel):
    id: str | None                        # null for a draft, which has no row behind it
    field: str | None
    source_lang: str | None
    target_lang: str
    text: str
    status: Literal["ok", "original", "unavailable", "private"]
    cached: bool


class BatchOut(BaseModel):
    items: list[TranslationOut]


class MeOut(BaseModel):
    auto: bool
    target: str
