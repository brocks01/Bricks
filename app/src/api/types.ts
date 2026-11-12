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
  phone: string | null;
  language: Language;
  channel_pref: ChannelPref;
  area_name: string | null;
  singpass_verified: boolean;
  simple_mode: boolean;
  onboarded_by: OnboardedBy;
  status: UserStatus;
  interests: Interest[];
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
  /** Where it is, for the Community map view (older servers may leave these out). */
  lat?: number;
  lng?: number;
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
  /**
   * The cover photo's main colour (#RRGGBB), set by the server when a photo is saved.
   * Tints the event page; without it the category colour is used.
   */
  cover_color?: string | null;
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
export type NewReminder = Pick<Reminder, 'kind' | 'text' | 'time' | 'repeat' | 'date'> & {
  /** Family setting a reminder for their parent (needs the parent's yes first). */
  for_senior_id?: string | null;
};

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
  /** The route with the 200 m around home left out (safe for a thumbnail). */
  route_public_polyline: string;
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
export type WalkPeriod = 'week' | 'month';

/** Personal bests (S24): all time, except walks this calendar month. */
export interface WalkBests {
  longest_m: number;
  longest_walk_id: string | null;
  most_steps_day: number;
  walks_this_month: number;
}

export interface WalkStats {
  period: WalkPeriod;
  distance_m: number;
  walks: number;
  moving_s: number;
  /** Week: Monday-first, metres each day. Month: the last four weeks, one bar each (date = Monday). */
  days: { date: string; distance_m: number }[];
  /** The same length of time just before ("1.2 km more than last week"). */
  previous_distance_m: number;
  bests: WalkBests;
  /** The walks in the period, newest first. */
  items: WalkListItem[];
  last_walk: WalkListItem | null;
}

export type SosHelperStatus = 'notified' | 'on_way' | 'arrived';

/** GET /sos/{id}. */
/** A seeded account the demo can act as (GET /demo/accounts, demo servers only). */
export interface DemoAccount {
  id: string;
  name: string;
  role: 'senior' | 'family' | 'helper' | 'circle' | 'judge';
}

/** POST /demo/reset: how long the server took. */
export interface Health {
  status: string;
  database: boolean;
}

export interface DemoReset {
  seconds: number;
}

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

/** POST /sos/{id}/respond body: a helper who is a member replies (S30). */
export type SosResponse = Extract<SosHelperStatus, 'on_way' | 'arrived'>;

/**
 * Push data the notifier sends with server notifications (iteration 2.2).
 * Proposed contract for the backend notifier (owner: backend); the app opens
 * S29 / S30 from these. Helpers can't GET someone else's alert, so the S30
 * push carries everything the screen shows.
 */
export type PushData =
  | { kind: 'checkin' }
  /** Missed check-in (escalation ladder, +2 h): opens S29 Are you OK? */
  | { kind: 'are_you_ok' }
  /** Someone in whose Safe Circle this member is pressed Help: opens S30. */
  | {
      kind: 'sos_alert';
      sos_id: string;
      member_name: string;
      member_phone: string | null;
      /** Where they are (or home); null if unknown. */
      lat: number | null;
      lng: number | null;
      created_at: string;
    };

/* ---------- Onboarding, Pass It On, Family, voice (iteration 1.3). Proposed shapes; confirm with backend. ---------- */

/** Interests asked at onboarding (S4); also the starting tags for "Ask me about". */
export const INTERESTS = [
  'walking',
  'taichi',
  'cooking',
  'chess',
  'music',
  'gardening',
  'teaching',
  'technology',
] as const;
export type Interest = (typeof INTERESTS)[number];

export type SignInMethod = 'singpass' | 'google' | 'phone';

/** POST /auth/{method}. Singpass fills in the name and area; the others don't. */
export interface SignInResult {
  prefill: { name: string | null; area_name: string | null };
  singpass_verified: boolean;
}

/** PATCH /me body (onboarding answers, Settings). */
export interface MeUpdate {
  name?: string;
  preferred_name?: string | null;
  area_name?: string | null;
  interests?: Interest[];
  channel_pref?: ChannelPref;
  language?: Language;
  /** Expo push token from our Android build (2.1). */
  push_token?: string;
}

/** GET/PUT /safe-circle: who we tell if the member needs help, in order. */
export interface SafeCircleMember {
  id: string;
  name: string;
  phone: string | null;
  is_family: boolean;
}
export type NewSafeCircleMember = Omit<SafeCircleMember, 'id'>;

/** A recorded voice clip: a voice intro, a thank-you or a story. */
export interface VoiceClip {
  audio_url: string;
  duration_s: number;
  /** What was said; null until it's been written out. */
  transcript: string | null;
}

/** GET/POST /skills. */
export interface SkillOffer {
  id: string;
  title: string;
  tags: string[];
  /** A session with a date also appears as a Kampung event (PO-4). */
  start_at: string | null;
  place_name: string | null;
  is_paid: boolean;
  event_id: string | null;
  /** People who thanked the member for this skill. */
  endorsement_count: number;
}

/** POST /skills body. Paid sessions come later; always free for now. */
export interface NewSkillOffer {
  title: string;
  tags: string[];
  start_at: string | null;
  place_name: string | null;
  is_paid: false;
}

/** A thank-you on the Thank-You Wall (endorsements in docs/03). Never negative, never stars. */
export interface ThankYou {
  id: string;
  from: PersonSummary;
  kind: 'thumb' | 'voice';
  voice: VoiceClip | null;
  skill: { id: string; title: string } | null;
  event_title: string | null;
  created_at: string;
}

export type BadgeKey = 'first_session' | 'ten_thanks' | 'kind_neighbour' | 'storyteller';

/** GET /users/{id}/profile (and /users/me/profile for Pass It On). */
export interface Profile {
  id: string;
  name: string;
  preferred_name: string | null;
  photo_url: string | null;
  area_name: string | null;
  languages: Language[];
  singpass_verified: boolean;
  intro: VoiceClip | null;
  /** "Ask me about" topics (their interests). */
  ask_me_about: Interest[];
  given: { sessions_taught: number; people_helped: number; thank_yous: number };
  skills: SkillOffer[];
  badges: { key: BadgeKey; earned_at: string }[];
  /** Newest first. */
  thank_yous: ThankYou[];
}

/** GET /endorsements/pending: events the member went to and hasn't thanked the host for yet. */
export interface ThanksPrompt {
  event_id: string;
  event_title: string;
  host: PersonSummary;
  skill: { id: string; title: string } | null;
  ended_at: string;
}

/** POST /endorsements. The server checks the member went to the event. */
export interface NewThanks {
  event_id: string;
  kind: 'thumb' | 'voice';
  /** Local recording, uploaded with the request. */
  audio_uri: string | null;
  duration_s: number | null;
}

/** PUT /me/intro: the voice intro on the profile (S5). */
export interface NewVoiceClip {
  audio_uri: string;
  duration_s: number;
}

export type Relation = 'mother' | 'father' | 'grandmother' | 'grandfather' | 'other';

/**
 * POST /family/invite (S9) and its status (S10). The senior's account stays
 * inactive until the senior says yes (ON-5).
 */
export interface FamilyInvite {
  id: string;
  senior_name: string;
  senior_phone: string;
  relation: Relation;
  language: Language;
  interests: Interest[];
  add_me_to_safe_circle: boolean;
  status: 'invited' | 'accepted';
  /** The parent's account, once they've said yes. */
  senior_id: string | null;
  created_at: string;
}
export type NewFamilyInvite = Omit<FamilyInvite, 'id' | 'status' | 'senior_id' | 'created_at'>;

/** Skill tags use the interest keys, so the app can translate them. */
export type SkillTag = Interest;

/** POST /assistant/transcribe: the words in a voice recording. */
export interface Transcript {
  text: string;
}

/** POST /tts: spoken audio for phones without a voice for this language. */
export interface SpokenAudio {
  audio_url: string;
}

/**
 * POST /assistant/turn: one thing the member said to Buddy (voice iteration 0.2,
 * shared contract). The backend's copy is backend/src/bricks_api/assistant/contract.py:
 * change both together. Send exactly one of `audio` (base64) or `text`, or only
 * `confirm` to answer a Yes / No.
 */
export interface AssistantTurnIn {
  language: Language;
  channel?: ChannelPref;
  audio?: string;
  audio_mime?: string;
  text?: string;
  /** The screen they're on and its Read It Out script, so "join that one" works. */
  screen?: string;
  screen_script?: string;
  /** The form on screen and what it holds now, so Buddy keeps what they typed by hand. */
  screen_fields?: ScreenField[];
  platform?: 'android' | 'ios';
  confirm?: { tool: string; args: Record<string, unknown>; answer: 'yes' | 'no' };
  conversation_id?: string;
}

/** One field of the form on screen (voice: show, don't tell). */
export interface ScreenField {
  id: string;
  label: string;
  kind: 'text' | 'choice' | 'date' | 'time' | 'number';
  value?: string | null;
  /** For a choice: the option ids it can take. */
  options?: string[];
}

/**
 * What the app does with Buddy's answer, played in order, one visible step at a time.
 * Show, don't tell: everything Buddy does must show on screen.
 */
export type UiAction =
  /** Ask first: Yes sends `confirm` back with this tool and args. */
  | { type: 'confirm'; tool: string; args: Record<string, unknown>; summary: string }
  | { type: 'navigate'; screen: string; id?: string | null }
  /** Scroll to and point at something on screen. */
  | { type: 'highlight'; target: string }
  /**
   * Put a value into a field, visibly (scroll to it, type or pick it, glow). Saves nothing.
   * value: text, option id, YYYY-MM-DD or HH:MM.
   */
  | { type: 'fill'; target: string; value: string }
  | { type: 'start_walk' }
  | { type: 'finish_walk' }
  | { type: 'start_warmup'; exercise?: string | null }
  | { type: 'open_sos'; reason?: string | null }
  /** Not understood twice: 2-3 big buttons; tapping one sends `say` as the next turn. */
  | { type: 'choices'; options: { label: string; say: string }[] };

export interface AssistantTurnOut {
  transcript: string;
  reply_text: string;
  /** Null: read reply_text with the phone's own voice. */
  reply_audio_url: string | null;
  ui_actions: UiAction[];
  /** False while Buddy waits for an answer (a confirmation or a choice). */
  done: boolean;
  conversation_id?: string | null;
}
