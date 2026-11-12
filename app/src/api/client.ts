import { config } from '@/lib/config';

import type { WalkUpload } from '@/features/walk/engine';
import type { Language } from '@/i18n/languages';

import { accessToken } from '@/lib/supabase';

import { useSettings } from '@/state/settings';

import { audioFile, formData, request, setAuthTokenProvider, setDemoUserProvider } from './http';
import { mockApi } from './mock';

import type {
  CheckinResult,
  CheckinWeek,
  CircleDetail,
  CircleList,
  CircleSummary,
  DemoAccount,
  DemoReset,
  Health,
  EventDetail,
  EventFilter,
  EventSummary,
  FamilyInvite,
  Me,
  MeUpdate,
  NewEvent,
  NewFamilyInvite,
  NewReminder,
  NewSafeCircleMember,
  NewSkillOffer,
  NewThanks,
  NewVoiceClip,
  Profile,
  Reminder,
  SafeCircleMember,
  SignInMethod,
  SignInResult,
  SkillOffer,
  SosAlert,
  SosResponse,
  SpokenAudio,
  ThankYou,
  ThanksPrompt,
  Today,
  Transcript,
  VoiceClip,
  GroupWalk,
  NewCheer,
  Org,
  OrgDetail,
  OrgJoined,
  OrgPerson,
  WalkPeriod,
  WalkVisibility,
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
  getWalkStats(period?: WalkPeriod): Promise<WalkStats>;
  /** S23: share a walk with my Circles (or stop sharing). */
  shareWalk(id: string, visibility: WalkVisibility): Promise<WalkSummary>;
  /** Cheer someone's shared walk: a tap or a short voice note. */
  cheerWalk(input: NewCheer): Promise<WalkSummary>;
  /** S19 Recent group walks (members of the Circle only). */
  getCircleWalks(circleId: string): Promise<GroupWalk[]>;
  triggerSos(input: {
    trigger: 'button';
    lat: number | null;
    lng: number | null;
  }): Promise<SosAlert>;
  getSos(id: string): Promise<SosAlert>;
  resolveSos(id: string): Promise<void>;
  /** A helper's reply to someone else's alert (S30). Rejects (404) once it's over. */
  respondSos(id: string, status: SosResponse): Promise<void>;
  /** "I'm OK" on S29: stops the missed-check-in ladder (doesn't answer the check-in). */
  confirmOk(): Promise<void>;

  // Iteration 1.3: onboarding, Pass It On, family, voice.
  signIn(method: SignInMethod, phone?: string): Promise<SignInResult>;
  updateMe(update: MeUpdate): Promise<Me>;
  getSafeCircle(): Promise<SafeCircleMember[]>;
  setSafeCircle(members: NewSafeCircleMember[]): Promise<SafeCircleMember[]>;
  /** 'me' for the signed-in member. */
  getProfile(id: string): Promise<Profile>;
  saveIntro(clip: NewVoiceClip): Promise<VoiceClip>;
  createSkill(input: NewSkillOffer): Promise<SkillOffer>;
  deleteSkill(id: string): Promise<void>;
  getThanksPrompts(): Promise<ThanksPrompt[]>;
  sendThanks(input: NewThanks): Promise<ThankYou>;
  skipThanks(eventId: string): Promise<void>;
  getFamilyInvites(): Promise<FamilyInvite[]>;
  createFamilyInvite(input: NewFamilyInvite): Promise<FamilyInvite>;
  /** The senior's yes (ON-5). Normally sent from WhatsApp or SMS; a demo control in the app. */
  acceptFamilyInvite(id: string): Promise<FamilyInvite>;
  /** S11: the organisations this member runs (staff only). */
  getMyOrgs(): Promise<Org[]>;
  getOrg(id: string): Promise<OrgDetail>;
  /** Upload a list: each person is Invited until they scan or tap the link. */
  addOrgPeople(id: string, people: OrgPerson[]): Promise<OrgDetail>;
  /** A member scanned the QR (or tapped the link). */
  joinOrg(code: string): Promise<OrgJoined>;
  /** S10: family turns Simple Mode on or off for a parent who has joined. */
  setSeniorSimpleMode(seniorId: string, on: boolean): Promise<void>;
  /** What was said in a recording. Rejects when there's no speech service (mock data). */
  transcribe(input: { audio_uri: string; language: Language }): Promise<Transcript>;
  /** Spoken audio for a phone without a voice for this language. */
  tts(input: { text: string; language: Language }): Promise<SpokenAudio>;

  // Iteration 2.3: cross-channel SOS and the demo controls.
  /** Their alert that's still going, however it started (app, WhatsApp, a call). */
  getActiveSos(): Promise<SosAlert | null>;
  /** Demo servers only: the seeded story again, dated from now. */
  resetDemo(): Promise<DemoReset>;
  /** Demo servers only: who the demo can act as. */
  getDemoAccounts(): Promise<DemoAccount[]>;

  // Iteration 3.1: at the venue.
  /** Is the server there (and its database)? Settings → Demo → Check connection. */
  getHealth(): Promise<Health>;
  /** Demo servers only: Judge n (1–10) back to fresh, for their QR link. */
  resetJudge(n: number): Promise<DemoAccount>;
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
  getWalkStats: (period = 'week') => request(`/walks/stats?period=${period}`),
  shareWalk: (id, visibility) =>
    request(`/walks/${encodeURIComponent(id)}`, { method: 'PATCH', body: { visibility } }),
  cheerWalk: ({ walk_id, kind, audio_uri, duration_s }) =>
    request(`/walks/${encodeURIComponent(walk_id)}/cheers`, {
      method: 'POST',
      body: formData({ kind, duration_s, audio: audio_uri ? audioFile(audio_uri) : null }),
    }),
  getCircleWalks: (circleId) => request(`/circles/${encodeURIComponent(circleId)}/walks`),
  triggerSos: (input) => request('/sos', { method: 'POST', body: input }),
  getSos: (id) => request(`/sos/${encodeURIComponent(id)}`),
  resolveSos: (id) =>
    request(`/sos/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status: 'resolved' } }),
  respondSos: (id, status) =>
    request(`/sos/${encodeURIComponent(id)}/respond`, { method: 'POST', body: { status } }),
  confirmOk: () =>
    request('/checkins/are-you-ok', { method: 'POST', body: { answer: 'ok', channel: 'app' } }),
  signIn: (method, phone) => request(`/auth/${method}`, { method: 'POST', body: { phone } }),
  updateMe: (update) => request('/me', { method: 'PATCH', body: update }),
  getSafeCircle: () => request('/safe-circle'),
  setSafeCircle: (members) => request('/safe-circle', { method: 'PUT', body: { members } }),
  getProfile: (id) => request(`/users/${encodeURIComponent(id)}/profile`),
  saveIntro: ({ audio_uri, duration_s }) =>
    request('/me/intro', {
      method: 'PUT',
      body: formData({ audio: audioFile(audio_uri), duration_s }),
    }),
  createSkill: (input) => request('/skills', { method: 'POST', body: input }),
  deleteSkill: (id) => request(`/skills/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  getThanksPrompts: () => request('/endorsements/pending'),
  sendThanks: ({ event_id, kind, audio_uri, duration_s }) =>
    request('/endorsements', {
      method: 'POST',
      body: formData({
        event_id,
        kind,
        duration_s,
        audio: audio_uri ? audioFile(audio_uri) : null,
      }),
    }),
  skipThanks: (eventId) =>
    request(`/endorsements/pending/${encodeURIComponent(eventId)}`, { method: 'DELETE' }),
  getFamilyInvites: () => request('/family/invites'),
  getMyOrgs: () => request('/orgs/mine'),
  getOrg: (id) => request(`/orgs/${encodeURIComponent(id)}`),
  addOrgPeople: (id, people) =>
    request(`/orgs/${encodeURIComponent(id)}/members/bulk`, { method: 'POST', body: { people } }),
  joinOrg: (code) => request(`/orgs/join/${encodeURIComponent(code)}`, { method: 'POST' }),
  setSeniorSimpleMode: (seniorId, on) =>
    request(`/family/seniors/${encodeURIComponent(seniorId)}/simple-mode`, {
      method: 'PUT',
      body: { on },
    }),
  createFamilyInvite: (input) => request('/family/invite', { method: 'POST', body: input }),
  acceptFamilyInvite: (id) =>
    request(`/invites/${encodeURIComponent(id)}/accept`, { method: 'POST' }),
  transcribe: ({ audio_uri, language }) =>
    request('/assistant/transcribe', {
      method: 'POST',
      body: formData({ audio: audioFile(audio_uri), language }),
      timeoutMs: 20_000,
    }),
  tts: (input) => request('/tts', { method: 'POST', body: input }),
  getActiveSos: () => request('/sos/active'),
  // Reseeding a remote database can take a few seconds.
  resetDemo: () => request('/demo/reset', { method: 'POST', timeoutMs: 20_000 }),
  getDemoAccounts: () => request('/demo/accounts'),
  getHealth: () => request('/health', { timeoutMs: 10_000 }),
  resetJudge: (n) => request(`/demo/judges/${n}/reset`, { method: 'POST', timeoutMs: 20_000 }),
};

// Every API request carries the Supabase access token of the signed-in member,
// and on a demo server the demo account chosen in Settings → Demo.
setAuthTokenProvider(accessToken);
setDemoUserProvider(() => useSettings.getState().demoUser);

export const api: BricksApi = config.useMocks || !config.apiUrl ? mockApi : httpApi;
