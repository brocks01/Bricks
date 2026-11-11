import { useRouter } from 'expo-router';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useCircles, useEvents } from '@/api';
import type { EventCategory, EventSummary } from '@/api/types';
import {
  BigButton,
  CalendarBlankIcon,
  Chip,
  ChipGroup,
  DateHeader,
  EmptyState,
  EventCard,
  EventsMap,
  ListBulletsIcon,
  MapTrifoldIcon,
  PlusIcon,
  QueryState,
  Screen,
  SectionCard,
  Text,
  UsersThreeIcon,
} from '@/components';
import { speakEvent } from '@/features/events/readout';
import { useJoinEvent } from '@/features/events/useJoinEvent';
import { calendarDaysBetween, formatWhen } from '@/lib/format';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

type TimeFilter = 'today' | 'week';
/** The kinds of happening, in the order shown when they're equally common. */
const KINDS: readonly EventCategory[] = [
  'walk',
  'exercise',
  'games',
  'music',
  'cooking',
  'gardening',
  'class',
  'meetup',
  'kids',
];
/** Kinds shown before "More kinds": the busiest ones. */
const KINDS_SHOWN = 4;

type Filter = { time: TimeFilter } | { kind: EventCategory } | null;

const filterKey = (f: Filter) => (!f ? null : 'time' in f ? f.time : f.kind);

/**
 * Community tab (S14, Luma's event list and map). Top: List / Map and My Circles.
 * "Near you": filters as big wrapping chips (never a sideways strip that hides
 * some of them), then the happenings grouped by day. "Start something" stays at
 * the bottom.
 */
export default function KampungScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const join = useJoinEvent();
  const [filter, setFilter] = useState<Filter>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [allKinds, setAllKinds] = useState(false);
  // Time filters ask the server; kinds are picked out of everything coming up.
  const events = useEvents(filter && 'time' in filter ? filter.time : null);
  const circles = useCircles();

  const myCount = circles.data?.mine.length ?? 0;
  const all = events.data ?? [];
  const list = filter && 'kind' in filter ? all.filter((e) => e.category === filter.kind) : all;

  // Busiest kinds first; a chosen kind always stays visible.
  const counts = new Map<EventCategory, number>();
  for (const e of all) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  const ranked = [...KINDS].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  const chosenKind = filter && 'kind' in filter ? filter.kind : null;
  const shownKinds = allKinds
    ? ranked
    : ranked.filter((k, i) => i < KINDS_SHOWN || k === chosenKind);

  const choose = (next: Filter) =>
    // Tapping the chosen filter again shows everything.
    setFilter(filterKey(next) === filterKey(filter) ? null : next);

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

  const open = (id: string) => router.push({ pathname: '/event/[id]', params: { id } });

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
      <ChipGroup testID="kampung-view">
        <Chip
          icon={ListBulletsIcon}
          label={t('kampung.list')}
          selected={view === 'list'}
          onPress={() => setView('list')}
          testID="kampung-view-list"
        />
        <Chip
          icon={MapTrifoldIcon}
          label={t('kampung.map')}
          selected={view === 'map'}
          onPress={() => setView('map')}
          testID="kampung-view-map"
        />
      </ChipGroup>

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

      <Text variant="title" style={styles.heading}>
        {t('kampung.nearYou')}
      </Text>
      <ChipGroup testID="kampung-filters">
        {(['today', 'week'] as const).map((f) => (
          <Chip
            key={f}
            label={t(`kampung.filter.${f}`)}
            selected={filterKey(filter) === f}
            onPress={() => choose({ time: f })}
            testID={`filter-${f}`}
          />
        ))}
        {shownKinds.map((k) => (
          <Chip
            key={k}
            label={t(`kampung.kind.${k}`)}
            selected={chosenKind === k}
            onPress={() => choose({ kind: k })}
            testID={`filter-${k}`}
          />
        ))}
        <Chip
          icon={allKinds ? undefined : PlusIcon}
          label={allKinds ? t('kampung.fewerKinds') : t('kampung.moreKinds')}
          selected={false}
          onPress={() => setAllKinds(!allKinds)}
          testID="filter-more-kinds"
        />
      </ChipGroup>

      <QueryState query={events}>
        {() =>
          list.length === 0 ? (
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
              {view === 'map' ? (
                <EventsMap
                  pins={list
                    .filter((e) => e.lat !== undefined && e.lng !== undefined)
                    .map((e) => ({
                      id: e.id,
                      title: e.title,
                      when: formatWhen(new Date(e.start_at), language, t),
                      lat: e.lat!,
                      lng: e.lng!,
                    }))}
                  onOpen={open}
                  label={t('kampung.mapLabel', { count: list.length })}
                />
              ) : null}
              <Timeline events={list} onOpen={open} onGoing={join} />
            </View>
          )
        }
      </QueryState>
    </Screen>
  );
}

/** Happenings grouped under "Tomorrow / Wednesday" headings. */
function Timeline({
  events,
  onOpen,
  onGoing,
}: {
  events: EventSummary[];
  onOpen: (id: string) => void;
  onGoing: (event: EventSummary) => void;
}) {
  const now = new Date();
  const dayOf = (e: EventSummary) => calendarDaysBetween(now, new Date(e.start_at));
  return (
    <>
      {events.map((event, i) => (
        <Fragment key={event.id}>
          {i === 0 || dayOf(event) !== dayOf(events[i - 1]!) ? (
            <DateHeader date={new Date(event.start_at)} now={now} />
          ) : null}
          <EventCard
            event={event}
            now={now}
            onOpen={() => onOpen(event.id)}
            onGoing={() => onGoing(event)}
          />
        </Fragment>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: space.md,
  },
  list: {
    gap: space.xs,
    marginTop: space.xs,
  },
});
