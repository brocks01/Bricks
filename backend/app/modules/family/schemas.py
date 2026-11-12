from pydantic import BaseModel, EmailStr, Field


class FamilyIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)


class MemberOut(BaseModel):
    user_id: str
    display_name: str | None
    language: str
    age_band: str | None
    phone: str | None
    role: str
    login_kind: str
    is_me: bool


class FamilyOut(BaseModel):
    id: str
    name: str
    created_by: str
    my_role: str
    members: list[MemberOut]


class FamilyMine(BaseModel):
    id: str
    name: str
    role: str
    member_count: int


class FamiliesOut(BaseModel):
    families: list[FamilyMine]


class InviteIn(BaseModel):
    contact: str = Field(min_length=3, max_length=120)  # an email address, or a phone number the code is given to
    role: str = Field(default="member", pattern="^(helper|member)$")


class InviteOut(BaseModel):
    invite_id: str
    role: str
    expires_in: int
    dev_code: str | None = None  # shown only in dev, to local callers, exactly like the sign-in code


class InviteAcceptIn(BaseModel):
    code: str = Field(min_length=6, max_length=6, pattern="^[0-9]{6}$")


class MemberRoleIn(BaseModel):
    role: str = Field(pattern="^(owner|helper|member)$")


class AssistedIn(BaseModel):
    display_name: str = Field(min_length=2, max_length=80)
    language: str = Field(default="en", pattern="^(en|hi|bn|ta|zh|ms)$")
    age_band: str | None = Field(default=None, pattern="^(under40|40to59|60plus)$")
    phone: str | None = Field(default=None, pattern=r"^\+?[0-9 ]{6,20}$")
    relationship: str | None = Field(default=None, max_length=40)  # "Grandfather", as the family says it


class DelegationOut(BaseModel):
    id: str
    user_id: str
    helper_id: str
    level: str
    status: str
    granted_by: str
    since: str
    user_name: str | None = None  # the name of the person being helped, for the accounts screen
    user_kind: str | None = None  # their login_kind: an assisted profile has no own login yet
    helper_name: str | None = None


class DelegationsOut(BaseModel):
    delegations: list[DelegationOut]


class DelegationGrantIn(BaseModel):
    helper_id: str
    level: str = Field(pattern="^(setup|ongoing|full)$")


class DelegationLevelIn(BaseModel):
    level: str = Field(pattern="^(setup|ongoing|full)$")


class PermissionEventOut(BaseModel):
    action: str
    detail: dict
    at: str
    actor: str | None
    helper: str | None


class PermissionEventsOut(BaseModel):
    events: list[PermissionEventOut]


class ClaimIn(BaseModel):
    code: str = Field(min_length=6, max_length=6, pattern="^[0-9]{6}$")
    email: EmailStr


class ClaimOut(BaseModel):
    access_token: str
    refresh_token: str
    user: "UserOut"
    is_new: bool


from ..identity.schemas import UserOut  # noqa: E402  (after the classes that reference it)

ClaimOut.model_rebuild()
