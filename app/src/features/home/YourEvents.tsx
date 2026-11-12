import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { EventSummary } from '@/api/types';
import { BigButton, CalendarBlankIcon, EmptyState, EventRow } from '@/components';
import { space } from '@/theme';

/** Home fits on one screen: the next plan, then a link to the rest. */
export const YOUR_EVENTS_SHOWN = 1;

/** The next event the member is going to, as a short row, and a link to all of them. */
export function YourEvents({
  events,
  meId,
  now = new Date(),
}: {
  events: EventSummary[];
  meId: string | undefined;
  now?: Date;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const mine = events
    .filter((e) => e.my_rsvp === 'going')
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const shown = mine.slice(0, YOUR_EVENTS_SHOWN);

  if (shown.length === 0) {
    return (
      <EmptyState
        icon={CalendarBlankIcon}
        text={t('home.nothingPlanned')}
        detail={t('home.nothingPlannedDetail')}
        actionLabel={t('home.findSomething')}
        onAction={() => router.navigate('/kampung')}
        testID="your-events-empty"
      />
    );
  }

  return (
    <View style={styles.list} testID="your-events">
      {shown.map((event) => (
        <EventRow
          key={event.id}
          event={event}
          now={now}
          hosting={!!meId && event.host.id === meId}
          onOpen={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
        />
      ))}
      {mine.length > shown.length ? (
        <BigButton
          variant="outline"
          label={t('home.seeAllEvents', { count: mine.length })}
          onPress={() => router.push({ pathname: '/kampung/happenings', params: { mine: '1' } })}
          testID="your-events-all"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.xs,
  },
});
