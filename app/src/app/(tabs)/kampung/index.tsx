import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useCircles, useEvents } from '@/api';
import type { EventFilter } from '@/api/types';
import {
  BigButton,
  CalendarBlankIcon,
  Chip,
  ChipGroup,
  EmptyState,
  EventCard,
  PlusIcon,
  QueryState,
  Screen,
  SectionCard,
  Text,
  UsersThreeIcon,
} from '@/components';
import { speakEvent } from '@/features/events/readout';
import { useJoinEvent } from '@/features/events/useJoinEvent';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

const FILTERS: readonly EventFilter[] = ['today', 'week', 'walk', 'class', 'kids'];

/**
 * Kampung tab (S14 Happenings, Luma event list). Top: a way into My Circles.
 * Then the events, newest first, with up to five filters as big wrapping
 * buttons (never a sideways carousel). "Start something" is fixed at the bottom.
 */
export default function KampungScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const join = useJoinEvent();
  const [filter, setFilter] = useState<EventFilter | null>(null);
  const events = useEvents(filter);
  const circles = useCircles();

  const myCount = circles.data?.mine.length ?? 0;
  const list = events.data ?? [];

  const readOut = () => {
    const summary =
      list.length > 0
        ? t('kampung.readoutSummary', {
            count: list.length,
            first: speakEvent(list[0]!, language, t),
          })
        : t('kampung.readoutNone');
    return t('kampung.readout', { summary });
  };

  return (
    <Screen
      title={t('kampung.title')}
      readOut={readOut}
      testID="screen-kampung"
      footer={
        <BigButton
          icon={PlusIcon}
          label={t('kampung.startSomething')}
          onPress={() => router.push('/kampung/create')}
          testID="kampung-start"
        />
      }
    >
      <SectionCard
        icon={UsersThreeIcon}
        title={t('kampung.myCircles.title')}
        description={
          myCount > 0
            ? t('kampung.myCircles.count', { count: myCount })
            : t('kampung.myCircles.none')
        }
        onPress={() => router.push('/kampung/circles')}
        testID="kampung-my-circles"
      />

      <Text variant="heading" style={styles.heading}>
        {t('kampung.happenings')}
      </Text>
      <ChipGroup testID="kampung-filters">
        {FILTERS.map((f) => (
          <Chip
            key={f}
            label={t(`kampung.filter.${f}`)}
            selected={filter === f}
            // Tapping the chosen filter again shows everything.
            onPress={() => setFilter(filter === f ? null : f)}
            testID={`filter-${f}`}
          />
        ))}
      </ChipGroup>

      <QueryState query={events}>
        {(items) =>
          items.length === 0 ? (
            filter ? (
              <EmptyState
                icon={CalendarBlankIcon}
                text={t('kampung.emptyFiltered')}
                actionLabel={t('kampung.showEverything')}
                onAction={() => setFilter(null)}
                testID="kampung-empty-filtered"
              />
            ) : (
              <EmptyState
                icon={CalendarBlankIcon}
                text={t('kampung.empty')}
                actionLabel={t('kampung.startSomething')}
                onAction={() => router.push('/kampung/create')}
                testID="kampung-empty"
              />
            )
          ) : (
            <View style={styles.list}>
              {items.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onOpen={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
                  onGoing={() => join(event)}
                />
              ))}
            </View>
          )
        }
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: space.md,
  },
  list: {
    gap: space.lg,
    marginTop: space.xs,
  },
});
