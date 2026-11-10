import { config } from '@/lib/config';

import { request } from './http';
import { mockApi } from './mock';
import type { WalkUpload } from '@/features/walk/engine';

import type {
  CheckinResult,
  CheckinWeek,
  CircleDetail,
  CircleList,
  CircleSummary,
  EventDetail,
  EventFilter,
  EventSummary,
  Me,
  NewEvent,
  NewReminder,
  Reminder,
  SosAlert,
  Today,
  WalkStats,
  WalkSummary,
} from './types';

/**
 * The app's one entry point to data. Screens use the hooks in ./queries,
 * which call this. Mocks and HTTP expose the same surface (docs/03 §4).
 */
export interface BricksApi {
  getMe(): Promise<Me>;
  getToday(): Promise<Today>;
  getEvents(filter: EventFilter | null): Promise<EventSummary[]>;
  getEvent(id: string): Promise<EventDetail>;
  rsvp(id: string): Promise<EventSummary>;
  cancelRsvp(id: string): Promise<EventSummary>;
  createEvent(input: NewEvent): Promise<EventDetail>;
  answerCheckin(answer: 'yes' | 'no'): Promise<CheckinResult>;
  completeReminder(id: string): Promise<void>;
  getCircles(): Promise<CircleList>;
  getCircle(id: string): Promise<CircleDetail>;
  joinCircle(id: string): Promise<CircleSummary>;
  leaveCircle(id: string): Promise<CircleSummary>;
  getCheckinWeek(): Promise<CheckinWeek>;
  getReminders(): Promise<Reminder[]>;
  createReminder(input: NewReminder): Promise<Reminder>;
  deleteReminder(id: string): Promise<void>;
  uploadWalk(upload: WalkUpload): Promise<WalkSummary>;
  getWalk(id: string): Promise<WalkSummary>;
  getWalkStats(): Promise<WalkStats>;
  triggerSos(input: {
    trigger: 'button';
    lat: number | null;
    lng: number | null;
  }): Promise<SosAlert>;
  getSos(id: string): Promise<SosAlert>;
  resolveSos(id: string): Promise<void>;
}

/** Filter → query string for GET /events. */
function eventsQuery(filter: EventFilter | null): string {
  if (filter === 'today' || filter === 'week') return `?when=${filter}`;
  if (filter) return `?category=${filter}`;
  return '';
}

const httpApi: BricksApi = {
  getMe: () => request('/me'),
  getToday: () => request('/home/today'),
  getEvents: (filter) => request(`/events${eventsQuery(filter)}`),
  getEvent: (id) => request(`/events/${encodeURIComponent(id)}`),
  rsvp: (id) => request(`/events/${encodeURIComponent(id)}/rsvp`, { method: 'POST' }),
  cancelRsvp: (id) => request(`/events/${encodeURIComponent(id)}/rsvp`, { method: 'DELETE' }),
  createEvent: (input) => request('/events', { method: 'POST', body: input }),
  answerCheckin: (answer) =>
    request('/checkins', {
      method: 'POST',
      body: { answer, question_key: 'moved_yesterday', channel: 'app' },
    }),
  completeReminder: (id) =>
    request(`/reminders/${encodeURIComponent(id)}/done`, { method: 'POST' }),
  getCircles: () => request('/circles'),
  getCircle: (id) => request(`/circles/${encodeURIComponent(id)}`),
  joinCircle: (id) => request(`/circles/${encodeURIComponent(id)}/join`, { method: 'POST' }),
  leaveCircle: (id) => request(`/circles/${encodeURIComponent(id)}/join`, { method: 'DELETE' }),
  getCheckinWeek: () => request('/checkins/week'),
  getReminders: () => request('/reminders'),
  createReminder: (input) => request('/reminders', { method: 'POST', body: input }),
  deleteReminder: (id) => request(`/reminders/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  uploadWalk: (upload) => request('/walks', { method: 'POST', body: upload }),
  getWalk: (id) => request(`/walks/${encodeURIComponent(id)}`),
  getWalkStats: () => request('/walks/stats?period=week'),
  triggerSos: (input) => request('/sos', { method: 'POST', body: input }),
  getSos: (id) => request(`/sos/${encodeURIComponent(id)}`),
  resolveSos: (id) =>
    request(`/sos/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status: 'resolved' } }),
};

export const api: BricksApi = config.useMocks || !config.apiUrl ? mockApi : httpApi;
