import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { Language } from '@/i18n/languages';
import { formatTime } from '@/lib/format';
import { space } from '@/theme';

import { BigButton } from './BigButton';
import { ButtonRow } from './ButtonRow';
import { Card } from './Card';
import { MinusIcon, PlusIcon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface TimeAdjusterProps {
  /** Minutes after midnight. */
  minutes: number;
  onChange: (minutes: number) => void;
  language: Language;
  /** Minute step for the lower row. */
  step?: number;
}

const DAY = 24 * 60;
const wrap = (m: number) => ((m % DAY) + DAY) % DAY;

/**
 * Setting a time with big buttons instead of spinning wheels (which are fiddly
 * for unsteady hands): the time is shown large, with Earlier / Later by the hour
 * and by 15 minutes. Every change is announced.
 */
export function TimeAdjuster({ minutes, onChange, language, step = 15 }: TimeAdjusterProps) {
  const { t } = useTranslation();
  const shown = formatTime(new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60), language);

  return (
    <Card tone="subtle" testID="time-adjuster">
      <Text
        variant="stat"
        align="center"
        accessibilityLiveRegion="polite"
        testID="time-adjuster-value"
      >
        {shown}
      </Text>
      <View style={styles.group}>
        <Text variant="bodyStrong">{t('reminders.new.hourLabel')}</Text>
        <ButtonRow>
          <BigButton
            variant="outline"
            icon={MinusIcon}
            label={t('reminders.new.earlier')}
            accessibilityLabel={`${t('reminders.new.hourLabel')}: ${t('reminders.new.earlier')}`}
            onPress={() => onChange(wrap(minutes - 60))}
            testID="time-hour-earlier"
          />
          <BigButton
            variant="outline"
            icon={PlusIcon}
            label={t('reminders.new.later')}
            accessibilityLabel={`${t('reminders.new.hourLabel')}: ${t('reminders.new.later')}`}
            onPress={() => onChange(wrap(minutes + 60))}
            testID="time-hour-later"
          />
        </ButtonRow>
      </View>
      <View style={styles.group}>
        <Text variant="bodyStrong">{t('reminders.new.minuteLabel')}</Text>
        <ButtonRow>
          <BigButton
            variant="outline"
            icon={MinusIcon}
            label={`${step}`}
            accessibilityLabel={`${t('reminders.new.minuteLabel')}: ${t('reminders.new.earlier')}`}
            onPress={() => onChange(wrap(minutes - step))}
            testID="time-minute-earlier"
          />
          <BigButton
            variant="outline"
            icon={PlusIcon}
            label={`${step}`}
            accessibilityLabel={`${t('reminders.new.minuteLabel')}: ${t('reminders.new.later')}`}
            onPress={() => onChange(wrap(minutes + step))}
            testID="time-minute-later"
          />
        </ButtonRow>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: space.xs,
  },
});
