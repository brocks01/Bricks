import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { LANGUAGE_INFO, type Language } from '@/i18n/languages';
import { space } from '@/theme';

import { BigButton } from './BigButton';
import { ButtonRow } from './ButtonRow';
import { Card } from './Card';
import { MinusIcon, PlusIcon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface DayAdjusterProps {
  /** Days from today (0 = today). */
  offset: number;
  onChange: (offset: number) => void;
  language: Language;
  min?: number;
  max?: number;
}

/** The date `offset` days from today, at midday (safe across clock changes). */
export function dayFromToday(offset: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(12, 0, 0, 0);
  return d;
}

/**
 * Choosing a date with big buttons instead of a calendar (small, fiddly targets):
 * the date is shown large with its weekday ("Saturday, 21 Nov"), with Earlier /
 * Later by a day and by a week. Every change is announced. Same pattern as
 * TimeAdjuster.
 */
export function DayAdjuster({ offset, onChange, language, min = 0, max = 90 }: DayAdjusterProps) {
  const { t } = useTranslation();
  const shown = new Intl.DateTimeFormat(LANGUAGE_INFO[language].intlLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(dayFromToday(offset));
  const go = (by: number) => onChange(Math.min(max, Math.max(min, offset + by)));

  const row = (label: string, by: number, id: string) => (
    <View style={styles.group}>
      <Text variant="bodyStrong">{label}</Text>
      <ButtonRow>
        <BigButton
          variant="outline"
          icon={MinusIcon}
          label={t('reminders.new.earlier')}
          accessibilityLabel={`${label}: ${t('reminders.new.earlier')}`}
          disabled={offset - by < min}
          onPress={() => go(-by)}
          testID={`day-${id}-earlier`}
        />
        <BigButton
          variant="outline"
          icon={PlusIcon}
          label={t('reminders.new.later')}
          accessibilityLabel={`${label}: ${t('reminders.new.later')}`}
          disabled={offset + by > max}
          onPress={() => go(by)}
          testID={`day-${id}-later`}
        />
      </ButtonRow>
    </View>
  );

  return (
    <Card tone="subtle" testID="day-adjuster">
      <Text
        variant="heading"
        align="center"
        accessibilityLiveRegion="polite"
        testID="day-adjuster-value"
      >
        {shown}
      </Text>
      {row(t('create.byDay'), 1, 'day')}
      {row(t('create.byWeek'), 7, 'week')}
    </Card>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: space.xs,
  },
});
