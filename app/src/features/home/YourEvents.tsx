import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { EventSummary } from '@/api/types';
import { BigButton, CalendarBlankIcon, DateHeader, EmptyState, EventCard } from '@/components';
import { useJoinEvent } from '@/features/events/useJoinEvent';
import { calendarDaysBetween } from '@/lib/format';
import { space } from '@/theme';

/** Home stays short: the next few plans, then a link to the rest. */
export const YOUR_EVENTS_SHOWN = 3;

/** Events the member is going to, soonest first, grouped under "Tomorrow / Wednesday". */
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
  const join = useJoinEvent();
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

  const dayOf = (e: EventSummary) => calendarDaysBetween(now, new Date(e.start_at));
  return (
    <View style={styles.list} testID="your-events">
      {shown.map((event, i) => {
        const start = new Date(event.start_at);
        // A heading above the first event of each day.
        const newDay = i === 0 || dayOf(event) !== dayOf(shown[i - 1]!);
        return (
          <Fragment key={event.id}>
            {newDay ? <DateHeader date={start} now={now} /> : null}
            <EventCard
              event={event}
              now={now}
              hosting={!!meId && event.host.id === meId}
              onOpen={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
              onGoing={() => join(event)}
            />
          </Fragment>
        );
      })}
      {mine.length > shown.length ? (
        <BigButton
          variant="outline"
          label={t('home.seeAllEvents', { count: mine.length })}
          onPress={() => router.navigate('/kampung')}
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
