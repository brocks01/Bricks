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
  NewEvent,
  NewReminder,
  Reminder,
} from './types';

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

export function useAnswerCheckin() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: CHECKIN_MUTATION,
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
    onSettled: () => refreshReminders(client),
  });
}

function useCircleMembership(join: boolean) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => (join ? api.joinCircle(id) : api.leaveCircle(id)),
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

export function useTriggerSos() {
  return useMutation({
    mutationFn: () => api.triggerSos({ trigger: 'button', lat: null, lng: null }),
  });
}

export function useResolveSos() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.resolveSos(id),
    onSettled: (_d, _e, id) => client.invalidateQueries({ queryKey: queryKeys.sos(id) }),
  });
}
