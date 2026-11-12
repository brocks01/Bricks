import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useFamilyOverview } from '@/api';
import {
  CalendarCheckIcon,
  InfoRow,
  PersonSimpleWalkIcon,
  Text,
  CheckCircleIcon,
} from '@/components';
import { formatDistance, formatWhen } from '@/lib/format';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/**
 * S10 parent overview (Apple Health sharing): this week's walks, the check-in
 * streak and their next plan. Only what the parent shares: if they've turned
 * sharing off, family just don't see this part.
 */
export function ParentOverview({ seniorId, name }: { seniorId: string; name: string }) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const overview = useFamilyOverview(seniorId);
  const o = overview.data;
  if (!o) return null;

  return (
    <View style={styles.list} testID={`family-overview-${seniorId}`}>
      <Text variant="bodyStrong">{t('familyOverview.thisWeek', { name })}</Text>
      <InfoRow
        icon={PersonSimpleWalkIcon}
        text={
          o.walks_this_week > 0
            ? t('familyOverview.walks', {
                count: o.walks_this_week,
                distance: formatDistance(o.distance_m_this_week, language),
              })
            : t('familyOverview.noWalks')
        }
      />
      <InfoRow
        icon={CheckCircleIcon}
        text={
          o.checkin_streak > 0
            ? t('familyOverview.streak', { count: o.checkin_streak })
            : t('familyOverview.noStreak')
        }
      />
      <InfoRow
        icon={CalendarCheckIcon}
        text={
          o.next_event
            ? t('familyOverview.next', {
                title: o.next_event.title,
                when: formatWhen(new Date(o.next_event.start_at), language, t),
              })
            : t('familyOverview.noNext')
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.xs,
  },
});
