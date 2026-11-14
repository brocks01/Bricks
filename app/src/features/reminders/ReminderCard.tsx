import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useCompleteReminder } from '@/api';
import type { Reminder } from '@/api/types';
import { BigButton, Card, StatusBanner, Text } from '@/components';
import { formatTime } from '@/lib/format';
import { categoryColor, iconSize, iconWell, radius, space } from '@/theme';
import { useCompact, useTypography } from '@/theme/TypographyProvider';

import { REMINDER_ICON, timeToday } from './kinds';

/** Reminders are rose: a white card with the kind's icon on a soft rose square. */
const REMINDER_TINT = categoryColor.music;

/**
 * The next reminder with one big Done button (Home "Today" and Thrive).
 * After Done it says so, rather than just vanishing.
 */
export function NextReminderCard({
  reminder,
}: {
  reminder: Pick<Reminder, 'id' | 'text' | 'time' | 'kind'> | null;
}) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const compact = useCompact();
  const complete = useCompleteReminder();

  // After Done, say so, then show what's next (if anything).
  const thanks = complete.isSuccess ? (
    <StatusBanner
      tone="success"
      text={t('home.reminder.doneThanks')}
      testID="reminder-done-thanks"
    />
  ) : null;
  if (!reminder) return thanks;

  const KindIcon = REMINDER_ICON[reminder.kind];
  return (
    <View style={styles.stack}>
      {thanks}
      <Card testID="next-reminder">
        <View style={[styles.row, compact && styles.wrapRow]}>
          <View style={styles.iconWell}>
            <KindIcon size={iconSize.inline} color={REMINDER_TINT.fg} weight="bold" />
          </View>
          <Text variant="bodyStrong" style={styles.flex}>
            {t('home.reminder.line', {
              time: formatTime(timeToday(reminder.time), language),
              text: reminder.text,
            })}
          </Text>
          {compact ? (
            <BigButton
              variant="success"
              fullWidth={false}
              label={t('home.reminder.done')}
              onPress={() => complete.mutate(reminder.id)}
              testID="next-reminder-done"
            />
          ) : null}
        </View>
        {compact ? null : (
          <BigButton
            variant="success"
            label={t('home.reminder.done')}
            onPress={() => complete.mutate(reminder.id)}
            testID="next-reminder-done"
          />
        )}
      </Card>
    </View>
  );
}

const ICON_WELL = iconWell.md;

const styles = StyleSheet.create({
  wrapRow: {
    flexWrap: 'wrap',
  },
  iconWell: {
    width: ICON_WELL,
    height: ICON_WELL,
    borderRadius: radius.tile,
    backgroundColor: REMINDER_TINT.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: {
    gap: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
});
