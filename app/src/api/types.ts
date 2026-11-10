/**
 * Wire types: the exact JSON the backend returns (docs/03_ARCHITECTURE.md §3–§4).
 * Kept in the API's snake_case so mocks and real responses are interchangeable.
 * Change these only together with the API contract (shared contract #1, owner: backend).
 */

import type { Language } from '@/i18n/languages';

export type ChannelPref = 'app' | 'whatsapp' | 'call';
export type OnboardedBy = 'self' | 'family' | 'admin';
export type UserStatus = 'invited' | 'active';

/** GET /me */
export interface Me {
  id: string;
  name: string;
  /** What we call them in greetings ("Raj", "Uncle Lim"). */
  preferred_name: string | null;
  phone: string;
  language: Language;
  channel_pref: ChannelPref;
  area_name: string | null;
  singpass_verified: boolean;
  simple_mode: boolean;
  onboarded_by: OnboardedBy;
  status: UserStatus;
}

/** Event categories. Each has an icon used when an event has no photo. */
export type EventCategory =
  | 'walk'
  | 'exercise'
  | 'class'
  | 'games'
  | 'music'
  | 'cooking'
  | 'gardening'
  | 'kids'
  | 'meetup'
  | 'other';

/** A person shown next to content (host, sender, captain). */
export interface PersonSummary {
  id: string;
  name: string;
  photo_url: string | null;
}

/**
 * GET /events (list items) and the summary part of GET /events/{id}.
 * Proposed shape for the backend contract (owner: backend); confirm in 1.1.
 */
export interface EventSummary {
  id: string;
  title: string;
  category: EventCategory;
  /** ISO 8601 with offset, e.g. "2026-11-12T07:00:00+08:00". */
  start_at: string;
  end_at: string | null;
  place_name: string;
  photo_url: string | null;
  going_count: number;
  /** The signed-in member's RSVP. */
  my_rsvp: 'going' | null;
  language: Language;
  whatsapp_link: string | null;
  host: PersonSummary;
}

/** GET /circles items. Proposed shape; confirm in 1.1. */
export interface CircleSummary {
  id: string;
  name: string;
  type: 'neighbourhood' | 'interest' | 'org';
  photo_url: string | null;
  member_count: number;
  whatsapp_link: string | null;
  is_member: boolean;
  next_event: Pick<EventSummary, 'id' | 'title' | 'start_at'> | null;
}

/** GET /events/{id}. Proposed shape; confirm with backend. */
export interface EventDetail extends EventSummary {
  description: string;
  lat: number;
  lng: number;
  /** First few people going, for the avatar row (going_count has the total). */
  attendees: PersonSummary[];
  circle: { id: string; name: string } | null;
}

/** Filters on Happenings: time ("today", "week") or kind ("walk", "class", "kids"). */
export type EventFilter = 'today' | 'week' | 'walk' | 'class' | 'kids';

/** GET /home/today. */
export interface Today {
  checkin: { pending: boolean; question_key: 'moved_yesterday' };
  /** The next thing worth joining, or the member's next RSVP. */
  next_event: EventSummary | null;
  next_reminder: Pick<Reminder, 'id' | 'text' | 'time' | 'kind'> | null;
}

/** POST /checkins response. */
export interface CheckinResult {
  answer: 'yes' | 'no';
  streak: number;
  /** On "no": a nearby group walk to join (Walk With Me). */
  suggestion: EventSummary | null;
}

/** GET /circles. */
export interface CircleList {
  mine: CircleSummary[];
  near: CircleSummary[];
}

/** GET /circles/{id}. */
export interface CircleDetail extends CircleSummary {
  description: string;
  captain: PersonSummary;
  members: PersonSummary[];
  upcoming: EventSummary[];
}

/** POST /events body (Start Something). */
export interface NewEvent {
  title: string;
  category: EventCategory;
  start_at: string;
  end_at: string | null;
  place_name: string;
  whatsapp_link: string | null;
}

/* ---------- Thrive (iteration 1.2). Proposed shapes; confirm with backend. ---------- */

export type ReminderKind = 'medicine' | 'doctor' | 'event' | 'other';
export type ReminderRepeat = 'once' | 'daily' | 'weekdays';

/** GET /reminders items. `time` is local "HH:MM". */
export interface Reminder {
  id: string;
  kind: ReminderKind;
  text: string;
  time: string;
  repeat: ReminderRepeat;
  /** For "once": the date it's for (YYYY-MM-DD). */
  date: string | null;
  done_today: boolean;
  created_by: 'self' | 'family' | 'call' | 'whatsapp';
}

/** POST /reminders body. */
export type NewReminder = Pick<Reminder, 'kind' | 'text' | 'time' | 'repeat' | 'date'>;

/** GET /checkins/week. Days are Monday-first, this week. */
export interface CheckinWeek {
  streak: number;
  days: { date: string; answer: 'yes' | 'no' | 'none' }[];
}

/** Why the server thinks this walk is worth celebrating (translated by the app). */
export type WalkPraise =
  | { kind: 'first_walk' }
  | { kind: 'longest_month' }
  | { kind: 'more_than_last'; extra_m: number }
  | { kind: 'steady' };

/** GET /walks list items and the header of a walk summary. */
export interface WalkListItem {
  id: string;
  /** e.g. "Morning walk". The place is separate so it can be translated around. */
  time_of_day: 'morning' | 'afternoon' | 'evening';
  start_place_name: string;
  started_at: string;
  distance_m: number;
  moving_s: number;
  steps: number;
}

/** GET /walks/{id}, and the response to POST /walks. */
export interface WalkSummary extends WalkListItem {
  ended_at: string;
  duration_s: number;
  avg_pace_s_per_km: number;
  /** One entry per full km, plus the last part-km. */
  splits: { km: number; distance_m: number; pace_s: number }[];
  /** Full route: only ever returned to the walker. */
  route_polyline: string | null;
  /** Route with ~200 m around home removed: safe to share (WK-6). */
  route_public_polyline: string;
  walked_with: PersonSummary[];
  praise: WalkPraise;
}

/** GET /walks/stats?period=week. */
export interface WalkStats {
  distance_m: number;
  walks: number;
  moving_s: number;
  /** Monday-first, this week: metres walked each day. */
  days: { date: string; distance_m: number }[];
  last_walk: WalkListItem | null;
}

export type SosHelperStatus = 'notified' | 'on_way' | 'arrived';

/** GET /sos/{id}. */
export interface SosAlert {
  id: string;
  status: 'open' | 'helper_coming' | 'resolved' | 'cancelled';
  created_at: string;
  helpers: {
    id: string;
    name: string;
    is_family: boolean;
    /** Straight-line distance from the member; null for family far away. */
    distance_m: number | null;
    status: SosHelperStatus;
  }[];
}
