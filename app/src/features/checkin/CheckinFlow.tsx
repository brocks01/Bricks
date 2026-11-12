import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAnswerCheckin, useLastCheckinResult } from '@/api';
import { BigButton, Card, EventCard, StatusBanner, Text, YesNo } from '@/components';
import { useJoinEvent } from '@/features/events/useJoinEvent';
import { categoryColor, space } from '@/theme';
import { useCompact } from '@/theme/TypographyProvider';

/**
 * The daily "Did you move yesterday?" (TH-1, our differentiator), used on Home,
 * on Thrive and as its own screen (S21). Yes celebrates the streak; No turns
 * into a nearby group walk you can join in one tap (TH-2 Walk With Me). Never
 * scolds: missing a day is just "That's okay".
 */
export function CheckinFlow({
  pending,
  onMaybeLater,
}: {
  pending: boolean;
  /** Shown as "Maybe later" next to the suggested walk (S21 screen). */
  onMaybeLater?: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const join = useJoinEvent();
  const checkin = useAnswerCheckin();
  const answered = useLastCheckinResult();
  const compact = useCompact();

  if (!pending && !answered) return null;

  if (!answered) {
    return (
      <Card testID="checkin-card" style={styles.tinted}>
        <Text variant={compact ? 'bodyStrong' : 'heading'}>{t('home.checkin.question')}</Text>
        <YesNo
          onYes={() => checkin.mutate('yes')}
          onNo={() => checkin.mutate('no')}
          testID="checkin"
        />
      </Card>
    );
  }

  if (answered.answer === 'yes') {
    return (
      <StatusBanner
        tone="success"
        text={t('home.checkin.thanks', { count: answered.streak })}
        testID="checkin-thanks"
      />
    );
  }

  const walk = answered.suggestion;
  if (!walk)
    return <StatusBanner tone="info" text={t('home.checkin.rest')} testID="checkin-rest" />;

  return (
    <View style={styles.group} testID="checkin-suggestion">
      <Text variant="bodyStrong">{t('home.checkin.company')}</Text>
      <EventCard
        compact
        event={walk}
        onOpen={() => router.push({ pathname: '/event/[id]', params: { id: walk.id } })}
        onGoing={() => join(walk)}
      />
      {onMaybeLater ? (
        <BigButton
          variant="outline"
          label={t('checkin.maybeLater')}
          onPress={onMaybeLater}
          testID="checkin-later"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // The daily question is green, like Health (where it also appears).
  tinted: {
    backgroundColor: categoryColor.walk.bg,
  },
  group: {
    gap: space.xs,
  },
});
