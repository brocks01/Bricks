"""Wire types: the exact JSON the app expects (app/src/api/types.ts).

Every response is validated against these, so a shape drift fails loudly here
instead of quietly breaking a screen. Change them only together with types.ts.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Language = Literal["en", "ms", "zh", "ta"]
ChannelPref = Literal["app", "whatsapp", "call"]
Interest = Literal[
    "walking", "taichi", "cooking", "chess", "music", "gardening", "teaching", "technology"
]
EventCategory = Literal[
    "walk", "exercise", "class", "games", "music", "cooking", "gardening", "kids", "meetup", "other"
]
EventFilter = Literal["today", "week", "walk", "class", "kids"]
ReminderKind = Literal["medicine", "doctor", "event", "other"]
ReminderRepeat = Literal["once", "daily", "weekdays"]
Relation = Literal["mother", "father", "grandmother", "grandfather", "other"]
BadgeKey = Literal["first_session", "ten_thanks", "kind_neighbour", "storyteller"]
HHMM = Annotated[str, Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")]
ISODate = Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]


class Wire(BaseModel):
    """A response: unknown fields are a bug on our side."""

    model_config = ConfigDict(extra="forbid")


class Input(BaseModel):
    """A request body: fields we don't know (newer app versions) are ignored."""

    model_config = ConfigDict(extra="ignore")


class PersonSummary(Wire):
    id: str
    name: str
    photo_url: str | None


class Me(Wire):
    id: str
    name: str
    preferred_name: str | None
    phone: str | None
    language: Language
    channel_pref: ChannelPref
    area_name: str | None
    singpass_verified: bool
    simple_mode: bool
    onboarded_by: Literal["self", "family", "admin"]
    status: Literal["invited", "active"]
    interests: list[Interest]


class MeUpdate(Input):
    name: Annotated[str, Field(min_length=1, max_length=80)] | None = None
    preferred_name: Annotated[str, Field(max_length=40)] | None = None
    area_name: Annotated[str, Field(max_length=80)] | None = None
    interests: list[Interest] | None = None
    channel_pref: ChannelPref | None = None
    language: Language | None = None
    push_token: Annotated[str, Field(max_length=200)] | None = None


class EventSummary(Wire):
    id: str
    title: str
    category: EventCategory
    start_at: str
    end_at: str | None
    place_name: str
    photo_url: str | None
    going_count: int
    my_rsvp: Literal["going"] | None
    language: Language
    whatsapp_link: str | None
    host: PersonSummary
    # Where it is, for the Community map view.
    lat: float
    lng: float


class CircleRef(Wire):
    id: str
    name: str


class EventDetail(EventSummary):
    description: str
    # The cover photo's main colour (#RRGGBB), set when a photo is saved. Tints the
    # app's event page; null until events have photos (the app uses the category colour).
    cover_color: str | None = None
    attendees: list[PersonSummary]
    circle: CircleRef | None


class NewEvent(Input):
    title: Annotated[str, Field(min_length=1, max_length=120)]
    category: EventCategory
    start_at: str
    end_at: str | None
    place_name: Annotated[str, Field(min_length=1, max_length=160)]
    whatsapp_link: Annotated[str, Field(max_length=300)] | None


class NextEventRef(Wire):
    id: str
    title: str
    start_at: str


class CircleSummary(Wire):
    id: str
    name: str
    type: Literal["neighbourhood", "interest", "org"]
    photo_url: str | None
    member_count: int
    whatsapp_link: str | None
    is_member: bool
    next_event: NextEventRef | None


class CircleList(Wire):
    mine: list[CircleSummary]
    near: list[CircleSummary]


class CircleDetail(CircleSummary):
    description: str
    captain: PersonSummary
    members: list[PersonSummary]
    upcoming: list[EventSummary]


class CheckinStatus(Wire):
    pending: bool
    question_key: Literal["moved_yesterday"]


class ReminderRef(Wire):
    id: str
    text: str
    time: str
    kind: ReminderKind


class Today(Wire):
    checkin: CheckinStatus
    next_event: EventSummary | None
    next_reminder: ReminderRef | None


class CheckinIn(Input):
    answer: Literal["yes", "no"]
    question_key: Literal["moved_yesterday"] = "moved_yesterday"
    channel: ChannelPref = "app"


class CheckinResult(Wire):
    answer: Literal["yes", "no"]
    streak: int
    suggestion: EventSummary | None


class CheckinDay(Wire):
    date: str
    answer: Literal["yes", "no", "none"]


class CheckinWeek(Wire):
    streak: int
    days: list[CheckinDay]


class Reminder(Wire):
    id: str
    kind: ReminderKind
    text: str
    time: str
    repeat: ReminderRepeat
    date: str | None
    done_today: bool
    created_by: Literal["self", "family", "call", "whatsapp"]


class NewReminder(Input):
    kind: ReminderKind
    text: Annotated[str, Field(min_length=1, max_length=120)]
    time: HHMM
    repeat: ReminderRepeat
    date: ISODate | None
    for_senior_id: str | None = None


class TrackPoint(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    t: float
    accuracy: float | None = None


class WalkUpload(Input):
    segments: Annotated[list[list[TrackPoint]], Field(max_length=200)]
    steps: Annotated[int, Field(ge=0)]
    started_at: str
    ended_at: str
    event_id: str | None


class Split(Wire):
    km: int
    distance_m: int
    pace_s: int


class WalkPraise(Wire):
    kind: Literal["first_walk", "longest_month", "more_than_last", "steady"]
    # Only for "more_than_last"; left out of the JSON otherwise, like the app's type.
    extra_m: int | None = Field(default=None, exclude_if=lambda v: v is None)


class WalkListItem(Wire):
    id: str
    time_of_day: Literal["morning", "afternoon", "evening"]
    start_place_name: str
    started_at: str
    distance_m: int
    moving_s: int
    steps: int
    # The route with the 200 m around home left out (safe for a thumbnail).
    route_public_polyline: str


class WalkSummary(WalkListItem):
    ended_at: str
    duration_s: int
    avg_pace_s_per_km: int
    splits: list[Split]
    route_polyline: str | None
    walked_with: list[PersonSummary]
    praise: WalkPraise


class WalkDay(Wire):
    date: str
    distance_m: int


class WalkBests(Wire):
    """Personal bests (S24): all time, except walks this calendar month."""

    longest_m: int
    longest_walk_id: str | None
    most_steps_day: int
    walks_this_month: int


class WalkStats(Wire):
    period: Literal["week", "month"]
    distance_m: int
    walks: int
    moving_s: int
    # Week: Monday to Sunday. Month: the last four weeks, one bar each (date = Monday).
    days: list[WalkDay]
    # The same length of time just before, for "1.2 km more than last week".
    previous_distance_m: int
    bests: WalkBests
    # The walks in the period, newest first.
    items: list[WalkListItem]
    last_walk: WalkListItem | None


class SosIn(Input):
    trigger: Literal["button", "voice", "volume", "fall"] = "button"
    lat: float | None = None
    lng: float | None = None


class SosPatch(Input):
    status: Literal["resolved", "cancelled"]


class SosRespond(Input):
    status: Literal["on_way", "arrived"]


class SosHelper(Wire):
    id: str
    name: str
    is_family: bool
    distance_m: int | None
    status: Literal["notified", "on_way", "arrived"]


class DemoAccount(Wire):
    id: str
    name: str
    role: Literal["senior", "family", "helper", "circle", "judge"]


class DemoReset(Wire):
    seconds: float


class SosAlert(Wire):
    id: str
    status: Literal["open", "helper_coming", "resolved", "cancelled"]
    created_at: str
    helpers: list[SosHelper]


class SignInIn(Input):
    phone: str | None = None


class Prefill(Wire):
    name: str | None
    area_name: str | None


class SignInResult(Wire):
    prefill: Prefill
    singpass_verified: bool


class SafeCircleMember(Wire):
    id: str
    name: str
    phone: str | None
    is_family: bool


class NewSafeCircleMember(Input):
    name: Annotated[str, Field(min_length=1, max_length=80)]
    phone: Annotated[str, Field(max_length=20)] | None
    is_family: bool


class SafeCirclePut(Input):
    members: Annotated[list[NewSafeCircleMember], Field(max_length=5)]


class VoiceClip(Wire):
    audio_url: str
    duration_s: float
    transcript: str | None


class SkillRef(Wire):
    id: str
    title: str


class SkillOffer(Wire):
    id: str
    title: str
    tags: list[str]
    start_at: str | None
    place_name: str | None
    is_paid: bool
    event_id: str | None
    endorsement_count: int


class NewSkillOffer(Input):
    title: Annotated[str, Field(min_length=1, max_length=120)]
    tags: Annotated[list[Interest], Field(max_length=8)]
    start_at: str | None
    place_name: Annotated[str, Field(max_length=160)] | None
    is_paid: Literal[False]


class ThankYou(Wire):
    id: str
    from_: PersonSummary = Field(alias="from", serialization_alias="from")
    kind: Literal["thumb", "voice"]
    voice: VoiceClip | None
    skill: SkillRef | None
    event_title: str | None
    created_at: str

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class Given(Wire):
    sessions_taught: int
    people_helped: int
    thank_yous: int


class Badge(Wire):
    key: BadgeKey
    earned_at: str


class Profile(Wire):
    id: str
    name: str
    preferred_name: str | None
    photo_url: str | None
    area_name: str | None
    languages: list[Language]
    singpass_verified: bool
    intro: VoiceClip | None
    ask_me_about: list[Interest]
    given: Given
    skills: list[SkillOffer]
    badges: list[Badge]
    thank_yous: list[ThankYou]


class ThanksPrompt(Wire):
    event_id: str
    event_title: str
    host: PersonSummary
    skill: SkillRef | None
    ended_at: str


class NewFamilyInvite(Input):
    senior_name: Annotated[str, Field(min_length=1, max_length=80)]
    senior_phone: Annotated[str, Field(min_length=8, max_length=20)]
    relation: Relation
    language: Language
    interests: list[Interest]
    add_me_to_safe_circle: bool


class FamilyInvite(Wire):
    id: str
    senior_name: str
    senior_phone: str
    relation: Relation
    language: Language
    interests: list[Interest]
    add_me_to_safe_circle: bool
    status: Literal["invited", "accepted"]
    senior_id: str | None
    created_at: str


class TtsIn(Input):
    text: Annotated[str, Field(min_length=1, max_length=2000)]
    language: Language


class Health(Wire):
    status: Literal["ok"]
    database: bool
