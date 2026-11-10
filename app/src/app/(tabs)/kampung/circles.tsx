import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useCircles, useJoinCircle, useLeaveCircle } from '@/api';
import type { CircleSummary } from '@/api/types';
import { ClubCard, QueryState, Screen, Text } from '@/components';
import { openExternal } from '@/lib/openExternal';
import { useUndo } from '@/state/undo';
import { space } from '@/theme';

/**
 * S18 My Circles (Strava Clubs list): your Circles first, with their WhatsApp
 * group one tap away; then Circles near you, each with one Join button.
 * No rankings, no leaderboards.
 */
export default function CirclesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const query = useCircles();
  const joinCircle = useJoinCircle();
  const leaveCircle = useLeaveCircle();
  const showUndo = useUndo((s) => s.show);

  const open = (c: CircleSummary) =>
    router.push({ pathname: '/kampung/circle/[id]', params: { id: c.id } });

  const join = (c: CircleSummary) => {
    joinCircle.mutate(c.id);
    showUndo(t('circles.joined', { name: c.name }), () => leaveCircle.mutate(c.id));
  };

  const card = (c: CircleSummary) => (
    <ClubCard
      key={c.id}
      circle={c}
      onOpen={() => open(c)}
      onJoin={() => join(c)}
      onWhatsApp={() => c.whatsapp_link && void openExternal(c.whatsapp_link)}
    />
  );

  const readOut = () => {
    const data = query.data;
    if (!data) return t('circles.title');
    return t('circles.readout', {
      mine: data.mine.map((c) => c.name).join(', ') || '0',
      near: data.near.length,
    });
  };

  return (
    <Screen title={t('circles.title')} readOut={readOut} testID="screen-circles">
      <QueryState query={query}>
        {({ mine, near }) => (
          <>
            <Text variant="heading">{t('circles.yours')}</Text>
            {mine.length > 0 ? (
              <View style={styles.list}>{mine.map(card)}</View>
            ) : (
              <Text color="textSecondary">{t('circles.noneYours')}</Text>
            )}

            <Text variant="heading" style={styles.heading}>
              {t('circles.near')}
            </Text>
            {near.length > 0 ? (
              <View style={styles.list}>{near.map(card)}</View>
            ) : (
              <Text color="textSecondary">{t('circles.noneNear')}</Text>
            )}
          </>
        )}
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: space.lg,
  },
  list: {
    gap: space.lg,
  },
});
