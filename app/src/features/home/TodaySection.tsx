import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAnswerCheckin, useCompleteReminder } from '@/api';
import type { Today } from '@/api/types';
import { BigButton, Card, EventCard, PillIcon, StatusBanner, Text, YesNo } from '@/components';
import { useJoinEvent } from '@/features/events/useJoinEvent';
import { formatTime } from '@/lib/format';
import { color, iconSize, space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/** "08:00" (from the API) → a Date today at that time, for formatting. */
export function timeToday(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

/**
 * The Today area of Home (S12): at most three things, in order of importance:
 * the morning check-in, the next event worth joining, and the next reminder.
 * Each answers in place; nothing here sends the member somewhere unexpected.
 */
export function TodaySection({ today }: { today: Today }) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const join = useJoinEvent();
  const checkin = useAnswerCheckin();
  const reminder = useCompleteReminder();

  const answered = checkin.data;
  const openEvent = (id: string) => router.push({ pathname: '/event/[id]', params: { id } });

  return (
    <View style={styles.section}>
      {/* Check-in (our differentiator): answer stays on screen after replying. */}
      {today.checkin.pending && !answered ? (
        <Card testID="home-checkin">
          <Text variant="heading">{t('home.checkin.question')}</Text>
          <YesNo
            onYes={() => checkin.mutate('yes')}
            onNo={() => checkin.mutate('no')}
            testID="home-checkin"
          />
        </Card>
      ) : null}

      {answered?.answer === 'yes' ? (
        <StatusBanner
          tone="success"
          text={t('home.checkin.thanks', { count: answered.streak })}
          testID="home-checkin-thanks"
        />
      ) : null}

      {answered?.answer === 'no' ? (
        answered.suggestion ? (
          <View style={styles.group} testID="home-checkin-suggestion">
            <Text variant="bodyStrong">{t('home.checkin.company')}</Text>
            <EventCard
              compact
              event={answered.suggestion}
              onOpen={() => openEvent(answered.suggestion!.id)}
              onGoing={() => join(answered.suggestion!)}
            />
          </View>
        ) : (
          <StatusBanner tone="info" text={t('home.checkin.rest')} />
        )
      ) : null}

      {/* Don't show the same walk twice when it's also the suggestion. */}
      {today.next_event && today.next_event.id !== answered?.suggestion?.id ? (
        <View style={styles.group}>
          <Text variant="bodyStrong" color="textSecondary">
            {t('home.comingUp')}
          </Text>
          <EventCard
            compact
            event={today.next_event}
            onOpen={() => openEvent(today.next_event!.id)}
            onGoing={() => join(today.next_event!)}
          />
        </View>
      ) : null}

      {today.next_reminder ? (
        <Card testID="home-reminder">
          <View style={styles.reminderRow}>
            <PillIcon size={iconSize.button} color={color.primary} weight="bold" />
            <Text variant="bodyStrong" style={styles.flex}>
              {t('home.reminder.line', {
                time: formatTime(timeToday(today.next_reminder.time), language),
                text: today.next_reminder.text,
              })}
            </Text>
          </View>
          <BigButton
            variant="success"
            label={t('home.reminder.done')}
            onPress={() => reminder.mutate(today.next_reminder!.id)}
            testID="home-reminder-done"
          />
        </Card>
      ) : reminder.isSuccess ? (
        <StatusBanner tone="success" text={t('home.reminder.doneThanks')} />
      ) : null}
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
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
});
