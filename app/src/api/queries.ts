import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { api } from './client';
import type { EventDetail, EventFilter, EventSummary, NewEvent } from './types';

/** Query keys mirror the endpoint paths, so invalidation reads like the API. */
export const queryKeys = {
  me: ['me'] as const,
  today: ['today'] as const,
  events: ['events'] as const,
  eventList: (filter: EventFilter | null) => ['events', 'list', filter ?? 'all'] as const,
  event: (id: string) => ['events', 'detail', id] as const,
  circles: ['circles'] as const,
  circle: (id: string) => ['circles', 'detail', id] as const,
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

export function useAnswerCheckin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (answer: 'yes' | 'no') => api.answerCheckin(answer),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.today }),
  });
}

export function useCompleteReminder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.completeReminder(id),
    onSettled: () => client.invalidateQueries({ queryKey: queryKeys.today }),
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
