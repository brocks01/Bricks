from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

from ...core import languages

Language = Literal["en", "hi", "bn", "ta", "zh", "ms"]
AgeBand = Literal["under40", "40to59", "60plus"]


class RequestCodeIn(BaseModel):
    email: EmailStr


class VerifyCodeIn(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")


class GoogleIn(BaseModel):
    id_token: str = Field(min_length=20, max_length=4096)


class ProvidersOut(BaseModel):
    """Which ways of signing in are switched on at this server."""

    email: bool
    google: bool
    singpass: bool
    digilocker: bool


class RefreshIn(BaseModel):
    refresh_token: str


class ProfilePatch(BaseModel):
    """Only the fields that are sent are changed. Send null to clear an optional field."""

    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    language: Language | None = None
    age_band: AgeBand | None = None
    phone: str | None = Field(default=None, max_length=20, pattern=r"^\+?[0-9 ]{6,20}$")
    area_name: str | None = Field(default=None, max_length=120)
    tz_offset_min: int | None = Field(default=None, ge=-840, le=840)  # minutes east of UTC, from the phone
    spoken_languages: list[str] | None = Field(default=None, max_length=23)  # languages the person speaks (see core/languages.py)
    comm_language: str | None = Field(default=None, max_length=8)  # the one they prefer to talk in

    @field_validator("spoken_languages")
    @classmethod
    def _spoken(cls, v):
        return None if v is None else languages.clean(v)

    @field_validator("comm_language")
    @classmethod
    def _comm(cls, v):
        if v is not None and v not in languages.SPOKEN:
            raise ValueError("unknown language")
        return v


class UserOut(BaseModel):
    tz_offset_min: int | None = None
    spoken_languages: list[str] = []
    comm_language: str | None = None
    id: str
    email: str | None
    display_name: str | None
    language: Language
    age_band: AgeBand | None
    phone: str | None
    area_name: str | None
    login_kind: str = "own"  # "assisted" = a family profile set up by someone else, no own login yet
    profile_complete: bool


class SessionOut(BaseModel):
    access_token: str
    refresh_token: str
    user: UserOut
    is_new: bool


class CodeSentOut(BaseModel):
    sent: bool
    expires_in: int
    dev_code: str | None = None  # only in dev mode, so local testing needs no email
