import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useMe, useWalk } from '@/api';
import type { WalkPraise, WalkSummary } from '@/api/types';
import {
  BigButton,
  BigStatsRow,
  PeopleRow,
  QueryState,
  RouteMap,
  Screen,
  SplitBars,
  StatusBanner,
  Text,
} from '@/components';
import {
  formatClock,
  formatCount,
  formatDay,
  formatDistance,
  formatMinutes,
  formatPace,
  formatTime,
  sayDistance,
  sayMinutes,
} from '@/lib/format';
import { decodePath } from '@/lib/geo';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/**
 * S23 Walk summary (Strava activity + Apple Fitness): title and when, the route
 * (with the 200 m around home hidden from anyone else), three big numbers,
 * average pace in words, each kilometre as simple bars, who walked with you and
 * a warm line. No calories, elevation or red/green judgements.
 */
export default function WalkSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const query = useWalk(id);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/thrive'));
  const footer = <BigButton label={t('common.done')} onPress={close} testID="walk-done" />;

  if (query.data) return <WalkSummaryView walk={query.data} footer={footer} />;
  return (
    <Screen title={t('thrive.lastWalk')} testID="screen-walk" footer={footer}>
      <QueryState query={query} notFoundText={t('walk.notFound')}>
        {() => null}
      </QueryState>
    </Screen>
  );
}

function usePraise(praise: WalkPraise, spoken = false): string {
  const { t } = useTranslation();
  const { language } = useTypography();
  const { data: me } = useMe();
  const name = me?.preferred_name ?? me?.name ?? '';
  if (praise.kind === 'more_than_last') {
    return t('walk.praise.more_than_last', {
      name,
      extra: spoken
        ? sayDistance(praise.extra_m, language, t)
        : formatDistance(praise.extra_m, language),
    });
  }
  return t(`walk.praise.${praise.kind}`, { name });
}

function WalkSummaryView({ walk, footer }: { walk: WalkSummary; footer: React.ReactNode }) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const praise = usePraise(walk.praise);
  const praiseSpoken = usePraise(walk.praise, true);
  const started = new Date(walk.started_at);
  const title = t('walk.titleAt', {
    title: t(`walk.title.${walk.time_of_day}`),
    place: walk.start_place_name,
  });
  // The walker sees their full route; anyone else only gets the privacy-trimmed one.
  const route = useMemo(
    () => decodePath(walk.route_polyline ?? walk.route_public_polyline),
    [walk.route_polyline, walk.route_public_polyline],
  );
  const distance = formatDistance(walk.distance_m, language);
  const time = formatMinutes(walk.moving_s, t);
  const steps = formatCount(walk.steps, language);

  return (
    <Screen
      readOut={() =>
        t('walk.summaryReadout', {
          title,
          distance: sayDistance(walk.distance_m, language, t),
          time: sayMinutes(walk.moving_s, t),
          steps,
          praise: praiseSpoken,
        })
      }
      testID="screen-walk"
      footer={footer}
    >
      <Text variant="title">{title}</Text>
      <Text color="textSecondary">
        {formatDay(started, language, t)}, {formatTime(started, language)}
      </Text>

      <RouteMap points={route} label={title} />

      <BigStatsRow
        stats={[
          { label: t('walk.distance'), value: distance },
          { label: t('walk.time'), value: time },
          { label: t('walk.steps'), value: steps },
        ]}
        testID="walk-summary-stats"
      />
      <Text>
        <Text variant="bodyStrong">{t('walk.avgPace')}: </Text>
        {formatPace(walk.avg_pace_s_per_km, t)}
      </Text>

      <StatusBanner tone="celebrate" text={praise} testID="walk-praise" />

      {walk.splits.length > 1 ? (
        <View style={styles.section}>
          <Text variant="heading">{t('walk.splits')}</Text>
          <SplitBars
            testID="walk-splits"
            splits={walk.splits.map((s) => {
              const label =
                s.distance_m >= 1000
                  ? t('walk.splitKm', { km: s.km })
                  : formatDistance(s.distance_m, language);
              const seconds = Math.round((s.pace_s * s.distance_m) / 1000);
              return {
                label,
                time: formatClock(seconds),
                pace_s: s.pace_s,
                spoken: `${sayDistance(s.distance_m >= 1000 ? s.km * 1000 : s.distance_m, language, t)}: ${sayMinutes(seconds, t)}`,
              };
            })}
          />
        </View>
      ) : null}

      {walk.walked_with.length > 0 ? (
        <View style={styles.section}>
          <Text variant="heading">{t('walk.walkedWith')}</Text>
          <PeopleRow
            people={walk.walked_with}
            label={walk.walked_with.map((p) => p.name.split(' ')[0]).join(', ')}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.xs,
    marginTop: space.sm,
  },
});
