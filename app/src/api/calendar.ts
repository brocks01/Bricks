import { api } from './client';

/**
 * The calendar part of the API: the people whose calendars I may open, the dated things that happen
 * (expanded on the server from the saved items), the items themselves, and the done/skipped marks.
 * Every refusal comes back as a machine `code` (for example no_access) the screens turn into words.
 */

export type CalendarKind = 'medicine' | 'appointment' | 'exercise' | 'event' | 'call' | 'other';
export type CalendarRepeat = 'none' | 'daily' | 'weekdays' | 'weekly';
export type MarkStatus = 'pending' | 'done' | 'skipped';

/** A person whose calendar I may open: me first, then family members I hold access for. */
export interface CalendarPerson {
  id: string;
  name: string;
  is_me: boolean;
  level: string; // self, setup, ongoing, full
}

/** One dated thing in the range: an expanded item, or (for me) a community activity I said I am going to. */
export interface Occurrence {
  item_id: string | null;
  occurs_at: string; // UTC ISO
  kind: CalendarKind;
  title: string;
  note: string | null;
  duration_min: number | null;
  status: MarkStatus;
  added_by_name: string;
  channel: 'app' | 'call' | 'both';
  can_edit: boolean;
  remind_before_min: number;
  activity_id?: string | null;
  community_id?: string | null;
}

/** The one item, as saved (the Item screen edits from this, not from guesses). */
export interface CalendarItem {
  id: string;
  person_id: string;
  kind: CalendarKind;
  title: string;
  note: string | null;
  first_date: string; // YYYY-MM-DD, in the person's own local time
  local_time: string; // HH:MM
  tz_offset_min: number;
  duration_min: number | null;
  repeat: CalendarRepeat;
  repeat_days: number[] | null; // 0=Mon .. 6=Sun
  until_date: string | null;
  remind_before_min: number;
  channel: 'app' | 'call' | 'both';
  status: 'active' | 'cancelled';
  added_by_name: string;
}

export interface NewItem {
  person_id?: string;
  kind: CalendarKind;
  title: string;
  note?: string | null;
  /** An aware ISO datetime: the moment it first happens, in the person's own local time. */
  starts_at: string;
  repeat: CalendarRepeat;
  repeat_days?: number[] | null;
  until_date?: string | null;
  remind_before_min?: number;
}

/** A heads-up the server gives when saving (never a blockade: the plan is saved all the same). */
export interface Clash {
  why: 'clash' | 'duplicate';
  with_title: string;
  with_at: string;
  gap_min: number;
}

export interface MissedRow {
  item_id: string;
  occurs_at: string;
  kind: CalendarKind;
  title: string;
  notify_family: boolean;
}

/** The person's standing word about reminder calls (agreed or not, and the allowed hours). */
export interface CallConsent {
  person_id: string;
  agreed: boolean;
  phone_masked?: string | null;
  language?: string | null;
  window_from?: string | null; // HH:MM, the person's own local time
  window_to?: string | null;
  agreed_at?: string | null;
  revoked?: boolean;
}

export interface CallConsentIn {
  person_id?: string;
  phone: string; // international form, e.g. +6591234567
  language?: string; // en, hi, bn, ta, zh, ms
  window_from?: string; // HH:MM, default 08:00
  window_to?: string; // HH:MM, default 20:00
  person_present?: boolean; // a helper must tick this: the person is here and said yes
}

const q = (params: Record<string, string | undefined>) => {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) usp.set(k, v);
  const s = usp.toString();
  return s ? `?${s}` : '';
};

export const calendarApi = {
  people: () => api<{ people: CalendarPerson[] }>('GET', '/v1/calendar/people'),

  /**
   * The app is open. Sent every minute while the Calendar tab is on: a hint for the reminder loop,
   * and the person's own time zone (minutes east of UTC) so reminders can speak in local time.
   */
  heartbeat: (tzOffsetMin: number) => api<{ ok: boolean }>('POST', '/v1/calendar/heartbeat', { tz_offset_min: tzOffsetMin }),

  /** The things of the last day that came and went without a mark (a 60-minute grace to tick them). */
  missed: (personId?: string) => api<{ missed: MissedRow[] }>('GET', `/v1/calendar/missed${q({ person_id: personId })}`),

  /** The dated things for one calendar. Defaults: from = 3 hours ago, to = 7 days ahead (server side). */
  occurrences: (personId?: string, from?: string, to?: string) =>
    api<{ occurrences: Occurrence[] }>('GET', `/v1/calendar/occurrences${q({ person_id: personId, from, to })}`),

  item: (id: string) => api<CalendarItem>('GET', `/v1/calendar/items/${id}`),

  create: (body: NewItem) => api<{ id: string; warnings: Clash[] }>('POST', '/v1/calendar/items', body),

  /** Only the fields sent change; the rest stays as it is. The warnings are heads-ups, not blocks. */
  update: (id: string, body: Partial<NewItem> & { notify_family?: boolean }) =>
    api<{ id: string; warnings: Clash[] }>('PATCH', `/v1/calendar/items/${id}`, body),

  cancel: (id: string) => api<{ id: string; status: string }>('DELETE', `/v1/calendar/items/${id}`),

  mark: (itemId: string, occursAt: string, status: 'done' | 'skipped') =>
    api<{ item_id: string; occurs_at: string; status: string }>('POST', `/v1/calendar/items/${itemId}/mark`, {
      occurs_at: occursAt,
      status,
    }),

  unmark: (itemId: string, occursAt: string) =>
    api<{ item_id: string; occurs_at: string; status: string }>(
      'DELETE',
      `/v1/calendar/items/${itemId}/mark${q({ occurs_at: occursAt })}`,
    ),

  /** The person's standing word about reminder calls (only for the chosen person). */
  getConsent: (personId?: string) => api<CallConsent>('GET', `/v1/calendar/consent${q({ person_id: personId })}`),

  /** Record the person's yes to reminder calls (a helper must set person_present when acting for someone else). */
  putConsent: (body: CallConsentIn) => api<CallConsent>('PUT', '/v1/calendar/consent', body),

  /** The person stops reminder calls for themselves. Only the person themselves may do this. */
  revokeConsent: (personId?: string) => api<{ person_id: string; agreed: boolean }>('DELETE', `/v1/calendar/consent${q({ person_id: personId })}`),
};
