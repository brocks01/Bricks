import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { useCancelRsvp, useRsvp } from '@/api';
import type { EventSummary } from '@/api/types';
import { useUndo } from '@/state/undo';

/** Undo key for joining an event; "You're going" closes itself when it's undone. */
export const rsvpUndoKey = (eventId: string) => `rsvp:${eventId}`;

/**
 * "I'm going", the same everywhere (Home, Happenings, event details, Circle page):
 * join instantly, open "You're going" (S16), and offer Undo for 8 seconds.
 * If joining fails, the screen rolls back and says so in plain words.
 */
export function useJoinEvent() {
  const { t } = useTranslation();
  const router = useRouter();
  const rsvp = useRsvp();
  const cancel = useCancelRsvp();
  const showUndo = useUndo((s) => s.show);

  return useCallback(
    (event: Pick<EventSummary, 'id' | 'title'>) => {
      rsvp.mutate(event.id, {
        onError: () => Alert.alert(t('common.error')),
      });
      router.push({ pathname: '/going/[id]', params: { id: event.id } });
      showUndo(
        t('going.undo', { title: event.title }),
        () => cancel.mutate(event.id),
        rsvpUndoKey(event.id),
      );
    },
    [rsvp, cancel, router, showUndo, t],
  );
}
