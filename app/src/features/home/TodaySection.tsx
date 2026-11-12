import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useLastCheckinResult } from '@/api';
import type { Today } from '@/api/types';
import { EventRow, useScreenOverflow } from '@/components';
import { CheckinFlow } from '@/features/checkin/CheckinFlow';
import { useJoinEvent } from '@/features/events/useJoinEvent';
import { NextReminderCard } from '@/features/reminders/ReminderCard';
import { space } from '@/theme';

export { timeToday } from '@/features/reminders/kinds';

/**
 * The Today area of Home (S12), as grey cards at the top: the morning check-in and
 * the next reminder. Each answers in place; nothing here sends the member somewhere
 * unexpected.
 */
export function TodaySection({ today }: { today: Today }) {
  return (
    <View style={styles.section}>
      <CheckinFlow pending={today.checkin.pending} />
      <NextReminderCard reminder={today.next_reminder} />
    </View>
  );
}

/**
 * "Picked for you" (Luma): one event worth joining that they aren't going to yet.
 * Hidden when it's already the check-in's walk suggestion, so it never shows twice,
 * and on a phone too small for it (Home fits one screen; Community lists every event).
 */
export function PickedForYou({ today }: { today: Today }) {
  const { t } = useTranslation();
  const router = useRouter();
  const join = useJoinEvent();
  const answered = useLastCheckinResult();
  const overflow = useScreenOverflow();
  // Once dropped it stays dropped, so Home can't flicker between the two layouts.
  const [dropped, setDropped] = useState(false);
  if (overflow > 0 && !dropped) setDropped(true);
  const event = today.next_event;
  if (dropped || !event || event.my_rsvp === 'going' || event.id === answered?.suggestion?.id)
    return null;

  return (
    <View testID="picked-for-you" accessibilityLabel={t('home.pickedForYou')}>
      <EventRow
        event={event}
        onOpen={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
        onGoing={() => join(event)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.xs + space.xxs,
  },
});
