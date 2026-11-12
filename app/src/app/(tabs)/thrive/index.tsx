import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { useCheckinWeek, useToday, useUploadWalk, useWalkStats } from '@/api';
import type { CheckinWeek, WalkStats } from '@/api/types';
import {
  BigButton,
  BellIcon,
  ChartBarIcon,
  FirstAidKitIcon,
  ButtonRow,
  Card,
  GroupedList,
  GroupedRow,
  PersonSimpleWalkIcon,
  QueryState,
  Screen,
  StatCard,
  StatusBanner,
} from '@/components';
import { timeToday } from '@/features/reminders/kinds';
import type { WalkSnapshot } from '@/features/walk/engine';
import {
  clearUnfinishedWalk,
  loadUnfinishedWalk,
  uploadFromSnapshot,
} from '@/features/walk/activeWalk';
import { formatDistance, formatTime, sayDistance, sayMinutes, weekdayLabels } from '@/lib/format';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/**
 * S20 Health (Apple Health summary), on one screen: a big Start walk, this week in
 * one number with a 7-day chart, then rows for the last walk and the reminders.
 * The daily check-in is on Home. Missed days are neutral grey, never red.
 */
export default function ThriveScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const today = useToday();
  const stats = useWalkStats();
  const week = useCheckinWeek();
  const upload = useUploadWalk();

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
    <Screen
      section="health"
      title={t('thrive.title')}
      // S27: the health card, one tap from Health (Apple's Medical ID).
      titleAction={
        <BigButton
          variant="outline"
          fullWidth={false}
          icon={FirstAidKitIcon}
          label={t('healthCard.title')}
          labelVariant="bodyStrong"
          onPress={() => router.push('/health-card')}
          testID="thrive-health-card"
        />
      }
      readOut={readOut}
      testID="screen-thrive"
    >
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

      <BigButton
        size="lg"
        icon={PersonSimpleWalkIcon}
        label={t('thrive.startWalk')}
        onPress={() => router.push('/walk/record')}
        testID="thrive-start-walk"
      />

      <QueryState query={stats}>
        {(s) => (
          <WeekSummary
            stats={s}
            week={week.data}
            reminderLine={
              today.data?.next_reminder
                ? t('thrive.nextReminder', {
                    time: formatTime(timeToday(today.data.next_reminder.time), language),
                    text: today.data.next_reminder.text,
                  })
                : t('thrive.noReminders')
            }
          />
        )}
      </QueryState>
    </Screen>
  );
}

function WeekSummary({
  stats,
  week,
  reminderLine,
}: {
  stats: WalkStats;
  week: CheckinWeek | undefined;
  reminderLine: string;
}) {
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
      <GroupedList>
        {/* Your walks: the last one on the row, the history (S24) behind it. */}
        {stats.last_walk ? (
          <GroupedRow
            icon={ChartBarIcon}
            tint="walk"
            title={t('history.title')}
            subtitle={t('history.lastLine', {
              // Place and distance only, so the row stays one line (the time is on the walk).
              line: `${stats.last_walk.start_place_name} · ${formatDistance(stats.last_walk.distance_m, language)}`,
            })}
            onPress={() => router.push('/thrive/history')}
            testID="thrive-last-walk"
          />
        ) : (
          <GroupedRow
            icon={PersonSimpleWalkIcon}
            tint="walk"
            title={t('thrive.lastWalk')}
            subtitle={t('thrive.noWalks')}
          />
        )}
        <GroupedRow
          icon={BellIcon}
          tint="music"
          title={t('thrive.reminders')}
          subtitle={reminderLine}
          onPress={() => router.push('/thrive/reminders')}
          testID="thrive-reminders"
        />
      </GroupedList>
    </View>
  );
}

const styles = StyleSheet.create({
  week: {
    gap: space.sm,
  },
});
