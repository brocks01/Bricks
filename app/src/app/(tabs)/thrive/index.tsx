import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { useCheckinWeek, useToday, useUploadWalk, useWalkStats } from '@/api';
import type { CheckinWeek, WalkStats } from '@/api/types';
import {
  BigButton,
  ButtonRow,
  Card,
  Chip,
  ChipGroup,
  PersonSimpleWalkIcon,
  QueryState,
  Screen,
  SectionCard,
  StatCard,
  StatusBanner,
  Text,
} from '@/components';
import { CheckinFlow } from '@/features/checkin/CheckinFlow';
import { NextReminderCard } from '@/features/reminders/ReminderCard';
import { timeToday } from '@/features/reminders/kinds';
import type { WalkSnapshot } from '@/features/walk/engine';
import {
  clearUnfinishedWalk,
  loadUnfinishedWalk,
  uploadFromSnapshot,
  useActiveWalk,
} from '@/features/walk/activeWalk';
import { config } from '@/lib/config';
import { platform } from '@/lib/platform';
import {
  formatDistance,
  formatMinutes,
  formatTime,
  sayDistance,
  sayMinutes,
  weekdayLabels,
} from '@/lib/format';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/**
 * S20 Thrive (Apple Health summary): the check-in if it's waiting, a big
 * Start walk, this week in one number with a 7-day chart, the last walk, and
 * the next reminder. Missed days are neutral grey, never red.
 */
export default function ThriveScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const today = useToday();
  const stats = useWalkStats();
  const week = useCheckinWeek();
  const upload = useUploadWalk();
  const walkSource = useActiveWalk((s) => s.source);
  const setWalkSource = useActiveWalk((s) => s.setSource);
  const simulationSpeed = useActiveWalk((s) => s.simulationSpeed);
  const setSimulationSpeed = useActiveWalk((s) => s.setSimulationSpeed);

  // A walk left unfinished when the app was closed: offer to save it.
  const [unfinished, setUnfinished] = useState<WalkSnapshot | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadUnfinishedWalk().then((snap) => active && setUnfinished(snap));
      return () => {
        active = false;
      };
    }, []),
  );

  const saveUnfinished = () => {
    if (!unfinished) return;
    upload.mutate(uploadFromSnapshot(unfinished), {
      onSuccess: (walk) => {
        void clearUnfinishedWalk();
        setUnfinished(null);
        router.push({ pathname: '/walk/[id]', params: { id: walk.id } });
      },
      onError: () => Alert.alert(t('walk.saveFailed')),
    });
  };

  const discardUnfinished = () => {
    void clearUnfinishedWalk();
    setUnfinished(null);
  };

  const readOut = () => {
    const s = stats.data;
    const w = week.data;
    const weekText =
      s && w
        ? t('thrive.readoutWeek', {
            distance: sayDistance(s.distance_m, language, t),
            walks: t('thrive.walks', { count: s.walks }),
            streak: t('thrive.streak', { count: w.streak }),
          })
        : '';
    const last = s?.last_walk
      ? t('thrive.readoutLast', {
          place: s.last_walk.start_place_name,
          distance: sayDistance(s.last_walk.distance_m, language, t),
          time: sayMinutes(s.last_walk.moving_s, t),
        })
      : '';
    const r = today.data?.next_reminder;
    const reminder = r
      ? t('thrive.readoutReminder', { time: formatTime(timeToday(r.time), language), text: r.text })
      : '';
    return t('thrive.readout', { week: weekText, last, reminder });
  };

  return (
    <Screen title={t('thrive.title')} readOut={readOut} testID="screen-thrive">
      {unfinished ? (
        <Card testID="thrive-unfinished">
          <StatusBanner tone="notice" text={t('thrive.unfinished')} />
          <ButtonRow>
            <BigButton
              label={t('thrive.saveWalk')}
              onPress={saveUnfinished}
              disabled={upload.isPending}
              testID="thrive-unfinished-save"
            />
            <BigButton
              variant="outline"
              label={t('thrive.discardWalk')}
              onPress={discardUnfinished}
              testID="thrive-unfinished-discard"
            />
          </ButtonRow>
        </Card>
      ) : null}

      {today.data ? <CheckinFlow pending={today.data.checkin.pending} /> : null}

      <BigButton
        size="lg"
        icon={PersonSimpleWalkIcon}
        label={t('thrive.startWalk')}
        onPress={() => router.push('/walk/record')}
        testID="thrive-start-walk"
      />
      {config.devTools ? (
        // Developer builds only: real GPS, or the simulated walk (1× or 10×) for indoor demos.
        <ChipGroup>
          {platform.canRecordGps ? (
            <Chip
              label="Real GPS"
              selected={walkSource === 'gps'}
              onPress={() => setWalkSource('gps')}
              testID="thrive-gps"
            />
          ) : null}
          {([1, 10] as const).map((speed) => (
            <Chip
              key={speed}
              label={`Simulated walk ${speed}×`}
              selected={walkSource === 'simulated' && simulationSpeed === speed}
              onPress={() => {
                setWalkSource('simulated');
                setSimulationSpeed(speed);
              }}
              testID={`thrive-sim-${speed}`}
            />
          ))}
        </ChipGroup>
      ) : null}

      <QueryState query={stats}>{(s) => <WeekSummary stats={s} week={week.data} />}</QueryState>

      <Text variant="heading" style={styles.heading}>
        {t('thrive.reminders')}
      </Text>
      {today.data?.next_reminder ? (
        <NextReminderCard reminder={today.data.next_reminder} />
      ) : (
        <Text color="textSecondary">{t('thrive.noReminders')}</Text>
      )}
      <BigButton
        variant="outline"
        label={t('thrive.seeReminders')}
        onPress={() => router.push('/thrive/reminders')}
        testID="thrive-reminders"
      />
    </Screen>
  );
}

function WeekSummary({ stats, week }: { stats: WalkStats; week: CheckinWeek | undefined }) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const labels = weekdayLabels(language);
  const km = formatDistance(stats.distance_m, language).replace(/\s?km$/, '');
  const metresOnly = stats.distance_m < 1000;

  const subParts = [t('thrive.walks', { count: stats.walks })];
  if (week) subParts.push(t('thrive.streak', { count: week.streak }));

  return (
    <View style={styles.week}>
      <StatCard
        label={t('thrive.thisWeek')}
        value={metresOnly ? formatDistance(stats.distance_m, language) : km}
        unit={metresOnly ? undefined : t('thrive.kmWalked')}
        sub={subParts.join(' · ')}
        // A day counts if they walked or said yes to the check-in.
        bars={stats.days.map((d, i) => ({
          label: labels[i] ?? '',
          value: d.distance_m,
          done: d.distance_m > 0 || week?.days[i]?.answer === 'yes',
        }))}
        testID="thrive-week"
      />
      {stats.last_walk ? (
        <SectionCard
          icon={PersonSimpleWalkIcon}
          title={t('thrive.lastWalk')}
          description={t('thrive.lastWalkLine', {
            place: stats.last_walk.start_place_name,
            distance: formatDistance(stats.last_walk.distance_m, language),
            time: formatMinutes(stats.last_walk.moving_s, t),
          })}
          onPress={() =>
            router.push({ pathname: '/walk/[id]', params: { id: stats.last_walk!.id } })
          }
          testID="thrive-last-walk"
        />
      ) : (
        <Text color="textSecondary">{t('thrive.noWalks')}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: space.md,
  },
  week: {
    gap: space.sm,
  },
});
