import { config } from '@/lib/config';

import { request } from './http';
import { mockApi } from './mock';
import type {
  CheckinResult,
  CircleDetail,
  CircleList,
  CircleSummary,
  EventDetail,
  EventFilter,
  EventSummary,
  Me,
  NewEvent,
  Today,
} from './types';

/**
 * The app's one entry point to data. Screens use the hooks in ./queries,
 * which call this. Mocks and HTTP expose the same surface (docs/03 §4).
 */
export interface KampungApi {
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
}

/** Filter → query string for GET /events. */
function eventsQuery(filter: EventFilter | null): string {
  if (filter === 'today' || filter === 'week') return `?when=${filter}`;
  if (filter) return `?category=${filter}`;
  return '';
}

const httpApi: KampungApi = {
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
};

export const api: KampungApi = config.useMocks || !config.apiUrl ? mockApi : httpApi;
