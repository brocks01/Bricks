import { createMockDb, MockNotFound, type MockDb } from '@/mocks/db';
import meFixture from '@/mocks/me.json';

import type { KampungApi } from './client';
import { ApiError } from './errors';
import type { Me } from './types';

/** Small delay in development so loading states get exercised, like a real network. */
const MOCK_LATENCY_MS = __DEV__ && process.env.NODE_ENV !== 'test' ? 250 : 0;

let db: MockDb = createMockDb();

/** Fresh seed data (tests, and the demo reset later). */
export function resetMockDb(now?: () => Date): void {
  db = createMockDb(now);
}

/** Runs a mock operation with network-like latency, a deep copy and 404 mapping. */
function respond<T>(operation: () => T, path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        // A deep copy keeps callers from mutating mock state.
        resolve(JSON.parse(JSON.stringify(operation() ?? null)) as T);
      } catch (error) {
        reject(error instanceof MockNotFound ? new ApiError(404, error.message, path) : error);
      }
    }, MOCK_LATENCY_MS);
  });
}

export const mockApi: KampungApi = {
  getMe: () => respond(() => meFixture as Me, '/me'),
  getToday: () => respond(() => db.getToday(), '/home/today'),
  getEvents: (filter) => respond(() => db.listEvents(filter), '/events'),
  getEvent: (id) => respond(() => db.getEvent(id), `/events/${id}`),
  rsvp: (id) => respond(() => db.rsvp(id), `/events/${id}/rsvp`),
  cancelRsvp: (id) => respond(() => db.cancelRsvp(id), `/events/${id}/rsvp`),
  createEvent: (input) => respond(() => db.createEvent(input), '/events'),
  answerCheckin: (answer) => respond(() => db.answerCheckin(answer), '/checkins'),
  completeReminder: (id) => respond(() => db.completeReminder(id), `/reminders/${id}/done`),
  getCircles: () => respond(() => db.listCircles(), '/circles'),
  getCircle: (id) => respond(() => db.getCircle(id), `/circles/${id}`),
  joinCircle: (id) => respond(() => db.joinCircle(id), `/circles/${id}/join`),
  leaveCircle: (id) => respond(() => db.leaveCircle(id), `/circles/${id}/join`),
};
