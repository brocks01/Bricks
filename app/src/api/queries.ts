import {
  keepPreviousData,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { api } from './client';
import type { WalkUpload } from '@/features/walk/engine';

import type {
  CheckinResult,
  EventDetail,
  EventFilter,
  EventSummary,
  MeUpdate,
  NewEvent,
  NewFamilyInvite,
  NewReminder,
  NewSafeCircleMember,
  NewSkillOffer,
  NewThanks,
  NewVoiceClip,
  Reminder,
  SignInMethod,
  SosResponse,
} from './types';
import type { LatLng } from '@/lib/geo';

/** Query keys mirror the endpoint paths, so invalidation reads like the API. */
export const queryKeys = {
  me: ['me'] as const,
  today: ['today'] as const,
  events: ['events'] as const,
  eventList: (filter: EventFilter | null) => ['events', 'list', filter ?? 'all'] as const,
  event: (id: string) => ['events', 'detail', id] as const,
  circles: ['circles'] as const,
  circle: (id: string) => ['circles', 'detail', id] as const,
  checkinWeek: ['checkins', 'week'] as const,
  reminders: ['reminders'] as const,
  walks: ['walks'] as const,
  walk: (id: string) => ['walks', 'detail', id] as const,
  walkStats: ['walks', 'stats'] as const,
  sos: (id: string) => ['sos', id] as const,
  activeSos: ['sos', 'active'] as const,
  demoAccounts: ['demo', 'accounts'] as const,
};

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: () => api.getMe() });
}

export function useToday() {
  return useQuery({ queryKey: queryKeys.today, queryFn: () => api.getToday() });
}

export function useEvents(filter: EventFilter | null) {
  return useQuery({
    queryKey: queryKeys.eventList(filter),
    queryFn: () => api.getEvents(filter),
    // Keep showing the current list while another filter loads: no flashing spinner.
    placeholderData: keepPreviousData,
  });
}

export function useEvent(id: string) {
  return useQuery({ queryKey: queryKeys.event(id), queryFn: () => api.getEvent(id) });
}

export function useCircles() {
  return useQuery({ queryKey: queryKeys.circles, queryFn: () => api.getCircles() });
}

export function useCircle(id: string) {
  return useQuery({ queryKey: queryKeys.circle(id), queryFn: () => api.getCircle(id) });
}

/** Anything showing events, RSVPs or circles may have changed. */
function refreshCommunity(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.events }),
    client.invalidateQueries({ queryKey: queryKeys.today }),
    client.invalidateQueries({ queryKey: queryKeys.circles }),
  ]);
}

/** Applies an RSVP change to every cached copy of the event, for an instant UI. */
function patchEventEverywhere(client: QueryClient, id: string, going: boolean) {
  const patch = <T extends EventSummary>(e: T): T =>
    e.id !== id || (e.my_rsvp === 'going') === going
      ? e
      : { ...e, my_rsvp: going ? 'going' : null, going_count: e.going_count + (going ? 1 : -1) };

  client.setQueryData<EventDetail>(queryKeys.event(id), (e) => e && patch(e));
  client.setQueriesData<EventSummary[]>({ queryKey: [...queryKeys.events, 'list'] }, (list) =>
    list?.map(patch),
  );
}

function useRsvpMutation(going: boolean) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => (going ? api.rsvp(id) : api.cancelRsvp(id)),
    meta: { errorToast: !going },
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: queryKeys.events });
      const snapshot = client.getQueriesData({ queryKey: queryKeys.events });
      patchEventEverywhere(client, id, going);
      return { snapshot };
    },
    onError: (_error, _id, context) => {
      // Put everything back exactly as it was.
      context?.snapshot.forEach(([key, data]) => client.setQueryData(key, data));
    },
    onSettled: () => refreshCommunity(client),
  });
}

/** POST /events/{id}/rsvp ("I'm going"). */
export const useRsvp = () => useRsvpMutation(true);
/** DELETE /events/{id}/rsvp (Undo / "I can't go any more"). */
export const useCancelRsvp = () => useRsvpMutation(false);

export function useCreateEvent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: NewEvent) => api.createEvent(input),
    onSuccess: (event) => client.setQueryData(queryKeys.event(event.id), event),
    onSettled: () => refreshCommunity(client),
  });
}

const CHECKIN_MUTATION = ['checkins', 'answer'] as const;

/** `quiet`: the caller says it didn't work itself (Buddy). */
export function useAnswerCheckin({ quiet = false }: { quiet?: boolean } = {}) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: CHECKIN_MUTATION,
    meta: { errorToast: !quiet },
    mutationFn: (answer: 'yes' | 'no') => api.answerCheckin(answer),
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: queryKeys.today }),
        client.invalidateQueries({ queryKey: queryKeys.checkinWeek }),
      ]),
  });
}

export function useCompleteReminder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.completeReminder(id),
    meta: { errorToast: true },
    onSettled: () => refreshReminders(client),
  });
}

function useCircleMembership(join: boolean) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => (join ? api.joinCircle(id) : api.leaveCircle(id)),
    meta: { errorToast: true },
    onSettled: () => refreshCommunity(client),
  });
}

export const useJoinCircle = () => useCircleMembership(true);
export const useLeaveCircle = () => useCircleMembership(false);

/* ---------- Thrive (1.2) ---------- */

function refreshReminders(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: queryKeys.reminders }),
    client.invalidateQueries({ queryKey: queryKeys.today }),
  ]);
}

export function useCheckinWeek() {
  return useQuery({ queryKey: queryKeys.checkinWeek, queryFn: () => api.getCheckinWeek() });
}

export function useReminders() {
  return useQuery({ queryKey: queryKeys.reminders, queryFn: () => api.getReminders() });
}

export function useCreateReminder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: NewReminder) => api.createReminder(input),
    onSettled: () => refreshReminders(client),
  });
}

export function useDeleteReminder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (reminder: Reminder) => api.deleteReminder(reminder.id),
    meta: { errorToast: true },
    // Gone from the list straight away; put back if the request fails.
    onMutate: async (reminder) => {
      await client.cancelQueries({ queryKey: queryKeys.reminders });
      const previous = client.getQueryData<Reminder[]>(queryKeys.reminders);
      client.setQueryData<Reminder[]>(queryKeys.reminders, (list) =>
        list?.filter((r) => r.id !== reminder.id),
      );
      return { previous };
    },
    onError: (_e, _r, context) => client.setQueryData(queryKeys.reminders, context?.previous),
    onSettled: () => refreshReminders(client),
  });
}

export function useWalk(id: string) {
  return useQuery({ queryKey: queryKeys.walk(id), queryFn: () => api.getWalk(id) });
}

export function useWalkStats() {
  return useQuery({ queryKey: queryKeys.walkStats, queryFn: () => api.getWalkStats() });
}

export function useUploadWalk() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (upload: WalkUpload) => api.uploadWalk(upload),
    onSuccess: (walk) => client.setQueryData(queryKeys.walk(walk.id), walk),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.walks }),
  });
}

/** Live SOS status, polled every 3 s until it's resolved (docs/04 §2.2). */
export function useSos(id: string | null) {
  return useQuery({
    queryKey: queryKeys.sos(id ?? 'none'),
    queryFn: () => api.getSos(id!),
    enabled: id !== null,
    refetchInterval: (query) =>
      query.state.data?.status === 'resolved' || query.state.data?.status === 'cancelled'
        ? false
        : 3000,
  });
}

/**
 * Their alert that's still going, however it started (WhatsApp "HELP", a call):
 * checked when the app opens or comes back, and every 15 s while it's open.
 */
export function useActiveSos(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.activeSos,
    queryFn: () => api.getActiveSos(),
    enabled,
    refetchInterval: enabled ? 15_000 : false,
  });
}

/** Demo servers: who the demo can act as (Settings → Demo). */
export function useDemoAccounts(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.demoAccounts,
    queryFn: () => api.getDemoAccounts(),
    enabled,
    retry: false,
  });
}

/**
 * The check-in answer given in this session (on any screen), so Home and Thrive
 * both show "Well done" or the suggested walk after answering once.
 */
export function useLastCheckinResult(): CheckinResult | undefined {
  const results = useMutationState({
    filters: { mutationKey: CHECKIN_MUTATION, status: 'success' },
    select: (m) => m.state.data as CheckinResult,
  });
  return results[results.length - 1];
}

/**
 * Help pressed. Pass where they are (started when the SOS screen opened, so the
 * countdown covers the wait); null sends no location and the server uses home.
 */
export function useTriggerSos() {
  return useMutation({
    mutationFn: async (where?: Promise<LatLng | null> | LatLng | null) => {
      const here = (await where) ?? null;
      return api.triggerSos({ trigger: 'button', lat: here?.lat ?? null, lng: here?.lng ?? null });
    },
  });
}

/** S30: a helper says "I'm on my way" to someone else's alert. */
export function useRespondSos() {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SosResponse }) => api.respondSos(id, status),
  });
}

/** S29: "I'm OK" after a missed check-in. */
export function useConfirmOk() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.confirmOk(),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.today }),
  });
}

export function useResolveSos() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.resolveSos(id),
    onSettled: (_d, _e, id) => client.invalidateQueries({ queryKey: queryKeys.sos(id) }),
  });
}

/* ---------- Onboarding, Pass It On, Family (1.3) ---------- */

export const queryKeys13 = {
  safeCircle: ['safe-circle'] as const,
  profile: (id: string) => ['profile', id] as const,
  thanksPrompts: ['endorsements', 'pending'] as const,
  familyInvites: ['family', 'invites'] as const,
};

export function useSignIn() {
  return useMutation({
    mutationFn: ({ method, phone }: { method: SignInMethod; phone?: string }) =>
      api.signIn(method, phone),
  });
}

/** `quiet`: the caller says it didn't work itself (onboarding). */
export function useUpdateMe({ quiet = false }: { quiet?: boolean } = {}) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (update: MeUpdate) => api.updateMe(update),
    meta: { errorToast: !quiet },
    onSuccess: (me) => client.setQueryData(queryKeys.me, me),
    onSettled: () => client.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useSafeCircle() {
  return useQuery({ queryKey: queryKeys13.safeCircle, queryFn: () => api.getSafeCircle() });
}

export function useSetSafeCircle() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (members: NewSafeCircleMember[]) => api.setSafeCircle(members),
    onSuccess: (list) => client.setQueryData(queryKeys13.safeCircle, list),
  });
}

/** 'me' for the signed-in member's own profile (Pass It On, S33). */
export function useProfile(id: string) {
  return useQuery({ queryKey: queryKeys13.profile(id), queryFn: () => api.getProfile(id) });
}

const refreshProfile = (client: QueryClient) => client.invalidateQueries({ queryKey: ['profile'] });

export function useSaveIntro() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (clip: NewVoiceClip) => api.saveIntro(clip),
    onSettled: () => refreshProfile(client),
  });
}

export function useCreateSkill() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: NewSkillOffer) => api.createSkill(input),
    // A skill with a date is also a Kampung event.
    onSettled: () => Promise.all([refreshProfile(client), refreshCommunity(client)]),
  });
}

export function useDeleteSkill() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSkill(id),
    onSettled: () => Promise.all([refreshProfile(client), refreshCommunity(client)]),
  });
}

export function useThanksPrompts() {
  return useQuery({ queryKey: queryKeys13.thanksPrompts, queryFn: () => api.getThanksPrompts() });
}

export function useSendThanks() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: NewThanks) => api.sendThanks(input),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys13.thanksPrompts }),
  });
}

export function useSkipThanks() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => api.skipThanks(eventId),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys13.thanksPrompts }),
  });
}

/** While anyone hasn't said yes yet, check every 10 s, so "Dad joined" shows soon after his Yes on WhatsApp. */
export function useFamilyInvites() {
  return useQuery({
    queryKey: queryKeys13.familyInvites,
    queryFn: () => api.getFamilyInvites(),
    refetchInterval: (query) =>
      query.state.data?.some((i) => i.status === 'invited') ? FAMILY_POLL_MS : false,
  });
}

const FAMILY_POLL_MS = 10_000;

export function useCreateFamilyInvite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: NewFamilyInvite) => api.createFamilyInvite(input),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys13.familyInvites }),
  });
}

export function useAcceptFamilyInvite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.acceptFamilyInvite(id),
    meta: { errorToast: true },
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys13.familyInvites }),
  });
}
