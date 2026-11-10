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
  next_reminder: { id: string; text: string; time: string } | null;
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
