import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { LANGUAGE_INFO } from '@/i18n/languages';
import { calendarDaysBetween, formatDay } from '@/lib/format';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

import { Text } from './primitives/Text';

/**
 * A timeline heading (Luma): "Tomorrow / Wednesday", or "14 Nov / Saturday" further
 * ahead. The first part is bold; the weekday after it is grey.
 */
export function DateHeader({ date, now, testID }: { date: Date; now?: Date; testID?: string }) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const locale = LANGUAGE_INFO[language].intlLocale;
  const days = calendarDaysBetween(now ?? new Date(), date);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  // "Today" / "Tomorrow" / a date, then the weekday. A day this week is already a weekday name.
  const isWeekdayName = days > 1 && days < 7;
  const main = isWeekdayName
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date)
    : formatDay(date, language, t, now);

  return (
    <View style={styles.row} accessibilityRole="header" accessible testID={testID}>
      {/* The row is the heading; its two parts are plain text inside it. */}
      <Text variant="heading" accessibilityRole="text">
        {main}
      </Text>
      <Text variant="heading" weight="regular" color="textSecondary" accessibilityRole="text">
        {` / ${weekday}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    marginTop: space.xs,
  },
});
