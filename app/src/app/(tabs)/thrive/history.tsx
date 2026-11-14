import type { TFunction } from 'i18next';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useWalkStats } from '@/api';
import type { WalkPeriod, WalkStats } from '@/api/types';
import {
  BigButton,
  ButtonRow,
  FootprintsIcon,
  GroupedList,
  GroupedRow,
  QueryState,
  RouteThumb,
  Screen,
  StatCard,
  StatusBanner,
  TrophyIcon,
  CalendarCheckIcon,
} from '@/components';
import type { Language } from '@/i18n/languages';
import { LANGUAGE_INFO } from '@/i18n/languages';
import {
  formatCount,
  formatDay,
  formatDistance,
  formatMinutes,
  sayDistance,
  weekdayLabels,
} from '@/lib/format';
import { useTypography } from '@/theme/TypographyProvider';
import { thumbSize } from '@/theme';

/**
 * S24 Walk history (Apple Health trends + a Strava log): this week or the last four
 * weeks in one number and simple bars, a kind comparison (never "less"), personal
 * bests, then every walk. One colour, no pace graphs, no red or green.
 */
export default function WalkHistoryScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const [period, setPeriod] = useState<WalkPeriod>('week');
  const stats = useWalkStats(period);

  const readOut = () => {
    const s = stats.data;
    if (!s) return t('history.title');
    return t(`history.readout.${period}`, {
      distance: sayDistance(s.distance_m, language, t),
      walks: t('thrive.walks', { count: s.walks }),
      compare: comparison(s, language, t, true) ?? '',
    });
  };

  return (
    <Screen
      section="health"
      title={t('history.title')}
      readOut={readOut}
      scroll
      testID="screen-walk-history"
    >
      <ButtonRow>
        {(['week', 'month'] as const).map((p) => (
          <BigButton
            key={p}
            variant={period === p ? 'primary' : 'outline'}
            label={t(`history.${p}`)}
            onPress={() => setPeriod(p)}
            accessibilityState={{ selected: period === p }}
            testID={`history-${p}`}
          />
        ))}
      </ButtonRow>
      <QueryState query={stats}>{(s) => <History stats={s} />}</QueryState>
    </Screen>
  );
}

type T = TFunction;

/** "1.2 km more than last week", or a gentle nudge. Null when there's nothing to compare. */
function comparison(s: WalkStats, language: Language, t: T, spoken = false): string | null {
  if (s.distance_m === 0 && s.previous_distance_m === 0) return null;
  const extra = s.distance_m - s.previous_distance_m;
  if (extra > 0 && s.previous_distance_m > 0) {
    return t(`history.more.${s.period}`, {
      distance: spoken ? sayDistance(extra, language, t) : formatDistance(extra, language),
    });
  }
  if (extra >= 0) return t(`history.good.${s.period}`);
  return t(`history.lighter.${s.period}`);
}

function History({ stats }: { stats: WalkStats }) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const days = weekdayLabels(language);
  const short = new Intl.DateTimeFormat(LANGUAGE_INFO[language].intlLocale, {
    day: 'numeric',
    month: 'short',
  });
  const metresOnly = stats.distance_m < 1000;
  const compare = comparison(stats, language, t);
  const openWalk = (id: string) => router.push({ pathname: '/walk/[id]', params: { id } });

  return (
    <>
      <StatCard
        label={t(`history.total.${stats.period}`)}
        value={
          metresOnly
            ? formatDistance(stats.distance_m, language)
            : formatDistance(stats.distance_m, language).replace(/\s?km$/, '')
        }
        unit={metresOnly ? undefined : t('thrive.kmWalked')}
        sub={[t('thrive.walks', { count: stats.walks }), formatMinutes(stats.moving_s, t)].join(
          ' · ',
        )}
        bars={stats.days.map((d, i) => ({
          label:
            stats.period === 'week' ? (days[i] ?? '') : short.format(new Date(`${d.date}T00:00`)),
          value: d.distance_m,
          done: d.distance_m > 0,
        }))}
        testID="history-total"
      />
      {compare ? (
        <StatusBanner
          tone={stats.distance_m >= stats.previous_distance_m ? 'celebrate' : 'info'}
          text={compare}
          testID="history-compare"
        />
      ) : null}

      <GroupedList title={t('history.bests')} testID="history-bests">
        <GroupedRow
          icon={TrophyIcon}
          tint="walk"
          title={t('history.longest')}
          value={formatDistance(stats.bests.longest_m, language)}
          onPress={
            stats.bests.longest_walk_id ? () => openWalk(stats.bests.longest_walk_id!) : undefined
          }
          testID="history-longest"
        />
        <GroupedRow
          icon={FootprintsIcon}
          tint="walk"
          title={t('history.mostSteps')}
          value={t('history.steps', {
            count: stats.bests.most_steps_day,
            value: formatCount(stats.bests.most_steps_day, language),
          })}
          testID="history-most-steps"
        />
        <GroupedRow
          icon={CalendarCheckIcon}
          tint="walk"
          title={t('history.thisMonth')}
          value={t('thrive.walks', { count: stats.bests.walks_this_month })}
          testID="history-this-month"
        />
      </GroupedList>

      <GroupedList title={t('history.walks')} testID="history-walks">
        {stats.items.length === 0 ? (
          <GroupedRow title={t(`history.none.${stats.period}`)} />
        ) : (
          stats.items.map((w) => (
            <GroupedRow
              key={w.id}
              leading={<RouteThumb polyline={w.route_public_polyline} size={thumbSize.sm} />}
              title={formatDay(new Date(w.started_at), language, t)}
              subtitle={t('thrive.lastWalkLine', {
                place: w.start_place_name,
                distance: formatDistance(w.distance_m, language),
                time: formatMinutes(w.moving_s, t),
              })}
              onPress={() => openWalk(w.id)}
              testID={`history-walk-${w.id}`}
            />
          ))
        )}
      </GroupedList>
    </>
  );
}
