"""Request and response shapes of the calendar routes."""
from pydantic import BaseModel


class PersonOut(BaseModel):
    id: str
    name: str
    is_me: bool
    level: str


class PeopleOut(BaseModel):
    people: list[PersonOut]


class ItemIn(BaseModel):
    person_id: str | None = None
    kind: str = "other"
    title: str
    note: str | None = None
    starts_at: str
    duration_min: int | None = None
    repeat: str = "none"
    repeat_days: list[int] | None = None
    until_date: str | None = None
    remind_before_min: int = 0
    channel: str = "app"
    notify_family: bool = True


class ItemPatch(BaseModel):
    kind: str | None = None
    title: str | None = None
    note: str | None = None
    starts_at: str | None = None
    duration_min: int | None = None
    repeat: str | None = None
    repeat_days: list[int] | None = None
    until_date: str | None = None
    remind_before_min: int | None = None
    channel: str | None = None
    notify_family: bool | None = None


class ItemIdOut(BaseModel):
    id: str


class CancelOut(BaseModel):
    id: str
    status: str


class OccurrenceOut(BaseModel):
    item_id: str | None
    occurs_at: str
    kind: str
    title: str
    note: str | None
    duration_min: int | None
    status: str
    added_by_name: str
    channel: str
    can_edit: bool
    remind_before_min: int = 0
    activity_id: str | None = None
    community_id: str | None = None


class OccurrencesOut(BaseModel):
    occurrences: list[OccurrenceOut]


class MarkIn(BaseModel):
    occurs_at: str
    status: str


class MarkOut(BaseModel):
    item_id: str
    occurs_at: str
    status: str
