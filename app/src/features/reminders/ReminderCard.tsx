import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useCompleteReminder } from '@/api';
import type { Reminder } from '@/api/types';
import { BigButton, Card, StatusBanner, Text } from '@/components';
import { formatTime } from '@/lib/format';
import { color, iconSize, space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

import { REMINDER_ICON, timeToday } from './kinds';

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
        <View style={styles.row}>
          <KindIcon size={iconSize.button} color={color.primary} weight="bold" />
          <Text variant="bodyStrong" style={styles.flex}>
            {t('home.reminder.line', {
              time: formatTime(timeToday(reminder.time), language),
              text: reminder.text,
            })}
          </Text>
        </View>
        <BigButton
          variant="success"
          label={t('home.reminder.done')}
          onPress={() => complete.mutate(reminder.id)}
          testID="next-reminder-done"
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
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
