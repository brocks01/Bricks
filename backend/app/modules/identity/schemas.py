from typing import Literal

from pydantic import BaseModel, EmailStr, Field

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


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str | None
    language: Language
    age_band: AgeBand | None
    phone: str | None
    area_name: str | None
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
