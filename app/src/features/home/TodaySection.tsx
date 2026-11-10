import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useLastCheckinResult } from '@/api';
import type { Today } from '@/api/types';
import { EventCard, Text } from '@/components';
import { CheckinFlow } from '@/features/checkin/CheckinFlow';
import { useJoinEvent } from '@/features/events/useJoinEvent';
import { NextReminderCard } from '@/features/reminders/ReminderCard';
import { space } from '@/theme';

export { timeToday } from '@/features/reminders/kinds';

/**
 * The Today area of Home (S12): at most three things, in order of importance:
 * the morning check-in, the next event worth joining, and the next reminder.
 * Each answers in place; nothing here sends the member somewhere unexpected.
 */
export function TodaySection({ today }: { today: Today }) {
  const { t } = useTranslation();
  const router = useRouter();
  const join = useJoinEvent();
  const answered = useLastCheckinResult();

  return (
    <View style={styles.section}>
      <CheckinFlow pending={today.checkin.pending} />

      {/* Don't show the same walk twice when it's also the check-in suggestion. */}
      {today.next_event && today.next_event.id !== answered?.suggestion?.id ? (
        <View style={styles.group}>
          <Text variant="bodyStrong" color="textSecondary">
            {t('home.comingUp')}
          </Text>
          <EventCard
            compact
            event={today.next_event}
            onOpen={() =>
              router.push({ pathname: '/event/[id]', params: { id: today.next_event!.id } })
            }
            onGoing={() => join(today.next_event!)}
          />
        </View>
      ) : null}

      <NextReminderCard reminder={today.next_reminder} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.md,
  },
  group: {
    gap: space.xs,
  },
});
