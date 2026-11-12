import { createMockDb, MockForbidden, MockNotFound, type MockDb } from '@/mocks/db';

import type { BricksApi } from './client';
import { ApiError } from './errors';

/** Small delay in development so loading states get exercised, like a real network. */
const MOCK_LATENCY_MS = __DEV__ && process.env.NODE_ENV !== 'test' ? 250 : 0;

let db: MockDb = createMockDb();

const NO_SPEECH = 'No speech service with mock data';

/** The mock data itself, for tests to check what was saved (no network delay). */
export const mockDb = (): MockDb => db;

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
        reject(
          error instanceof MockNotFound
            ? new ApiError(404, error.message, path)
            : error instanceof MockForbidden
              ? new ApiError(403, error.message, path)
              : error,
        );
      }
    }, MOCK_LATENCY_MS);
  });
}

export const mockApi: BricksApi = {
  getMe: () => respond(() => db.getMe(), '/me'),
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
  getCheckinWeek: () => respond(() => db.checkinWeek(), '/checkins/week'),
  getReminders: () => respond(() => db.listReminders(), '/reminders'),
  createReminder: (input) => respond(() => db.createReminder(input), '/reminders'),
  deleteReminder: (id) => respond(() => db.deleteReminder(id), `/reminders/${id}`),
  uploadWalk: (upload) => respond(() => db.uploadWalk(upload), '/walks'),
  getWalk: (id) => respond(() => db.getWalk(id), `/walks/${id}`),
  getWalkStats: (period = 'week') => respond(() => db.walkStats(period), '/walks/stats'),
  shareWalk: (id, visibility) => respond(() => db.shareWalk(id, visibility), `/walks/${id}`),
  cheerWalk: (input) => respond(() => db.cheerWalk(input), `/walks/${input.walk_id}/cheers`),
  getCircleWalks: (circleId) =>
    respond(() => db.circleWalks(circleId), `/circles/${circleId}/walks`),
  triggerSos: () => respond(() => db.triggerSos(), '/sos'),
  getSos: (id) => respond(() => db.getSos(id), `/sos/${id}`),
  resolveSos: (id) => respond(() => db.resolveSos(id), `/sos/${id}`),
  respondSos: (id, status) => respond(() => db.respondSos(id, status), `/sos/${id}/respond`),
  confirmOk: () => respond(() => db.confirmOk(), '/checkins/are-you-ok'),
  signIn: (method) => respond(() => db.signIn(method), `/auth/${method}`),
  updateMe: (update) => respond(() => db.updateMe(update), '/me'),
  getSafeCircle: () => respond(() => db.getSafeCircle(), '/safe-circle'),
  setSafeCircle: (members) => respond(() => db.setSafeCircle(members), '/safe-circle'),
  getProfile: (id) => respond(() => db.getProfile(id), `/users/${id}/profile`),
  saveIntro: (clip) => respond(() => db.saveIntro(clip), '/me/intro'),
  createSkill: (input) => respond(() => db.createSkill(input), '/skills'),
  deleteSkill: (id) => respond(() => db.deleteSkill(id), `/skills/${id}`),
  getThanksPrompts: () => respond(() => db.getThanksPrompts(), '/endorsements/pending'),
  sendThanks: (input) => respond(() => db.sendThanks(input), '/endorsements'),
  skipThanks: (eventId) =>
    respond(() => db.skipThanks(eventId), `/endorsements/pending/${eventId}`),
  getFamilyInvites: () => respond(() => db.getFamilyInvites(), '/family/invites'),
  createFamilyInvite: (input) => respond(() => db.createFamilyInvite(input), '/family/invite'),
  acceptFamilyInvite: (id) => respond(() => db.acceptFamilyInvite(id), `/invites/${id}/accept`),
  getHealthCard: (seniorId) => respond(() => db.getHealthCard(seniorId), '/health-card'),
  saveHealthCard: (card, seniorId) =>
    respond(() => db.saveHealthCard(card, seniorId), '/health-card'),
  getStories: (seniorId) => respond(() => db.getStories(seniorId), '/stories'),
  recordStory: (story) => respond(() => db.recordStory(story), '/stories'),
  deleteStory: (id) => respond(() => db.deleteStory(id), `/stories/${id}`),
  askForStory: (seniorId, text) =>
    respond(() => db.askForStory(seniorId, text), `/family/seniors/${seniorId}/questions`),
  getFamilyOverview: (seniorId) =>
    respond(() => db.familyOverview(seniorId), `/family/seniors/${seniorId}/overview`),
  getMyOrgs: () => respond(() => db.myOrgs(), '/orgs/mine'),
  getOrg: (id) => respond(() => db.getOrg(id), `/orgs/${id}`),
  addOrgPeople: (id, people) =>
    respond(() => db.addOrgPeople(id, people), `/orgs/${id}/members/bulk`),
  joinOrg: (code) => respond(() => db.joinOrg(code), `/orgs/join/${code}`),
  setSeniorSimpleMode: (seniorId, on) =>
    respond(() => db.setSeniorSimpleMode(seniorId, on), `/family/seniors/${seniorId}/simple-mode`),
  // No speech service on mock data: voice screens use demo phrases and the phone's own voice.
  transcribe: () => Promise.reject(new ApiError(503, NO_SPEECH, '/assistant/transcribe')),
  tts: () => Promise.reject(new ApiError(503, NO_SPEECH, '/tts')),
  getActiveSos: () => respond(() => db.activeSos(), '/sos/active'),
  resetDemo: () =>
    respond(() => {
      resetMockDb();
      return { seconds: 0 };
    }, '/demo/reset'),
  // The mock data is Raj's world only, so there is nobody to switch to.
  getDemoAccounts: () =>
    respond(() => [{ id: 'u_raj', name: 'Raj Kumar', role: 'senior' as const }], '/demo/accounts'),
  getHealth: () => respond(() => ({ status: 'ok', database: true }), '/health'),
  // Judge links on mock data: Raj's world, fresh.
  resetJudge: (n) =>
    respond(() => {
      resetMockDb();
      return { id: `u_judge${n}`, name: `Judge ${n}`, role: 'judge' as const };
    }, `/demo/judges/${n}/reset`),
};
