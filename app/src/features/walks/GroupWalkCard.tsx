import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { GroupWalk } from '@/api/types';
import { AvatarStack, Card, RouteThumb, Text } from '@/components';
import { formatDay, formatDistance } from '@/lib/format';
import { color, thumbSize, space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

import { CheerButtons } from './cheers';

/**
 * S19 Recent group walks, one card: the route (public part only), "Lim · 9 people ·
 * 3.1 km · Saturday", who walked, and Cheer / Voice cheer. On their own walk: how
 * many cheers. No rankings, no leaderboards.
 */
export function GroupWalkCard({ walk }: { walk: GroupWalk }) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const who = walk.is_mine ? t('walkFeed.you') : walk.owner.name.split(' ')[0];
  const group = walk.walkers.length > 1;
  const line = [
    // A walk on their own just says how far and when.
    ...(group ? [t('walkFeed.people', { count: walk.walkers.length })] : []),
    formatDistance(walk.distance_m, language),
    formatDay(new Date(walk.started_at), language, t),
  ].join(' · ');
  const testID = `group-walk-${walk.id}`;

  return (
    <Card testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${who}. ${line}`}
        onPress={() => router.push({ pathname: '/walk/[id]', params: { id: walk.id } })}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        testID={`${testID}-open`}
      >
        <RouteThumb polyline={walk.route_public_polyline} size={THUMB} />
        <View style={styles.words}>
          <Text variant="bodyStrong">{who}</Text>
          <Text color="textSecondary">{line}</Text>
          {group ? <AvatarStack people={walk.walkers} max={5} /> : null}
        </View>
      </Pressable>
      {walk.is_mine ? (
        <Text color="textSecondary" testID={`${testID}-count`}>
          {walk.cheer_count > 0
            ? t('walkFeed.cheerCount', { count: walk.cheer_count })
            : t('walkFeed.noCheers')}
        </Text>
      ) : (
        <CheerButtons
          walkId={walk.id}
          owner={walk.owner}
          cheered={walk.cheered_by_me}
          testID={testID}
        />
      )}
    </Card>
  );
}

const THUMB = thumbSize.lg;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: space.sm,
  },
  pressed: {
    backgroundColor: color.primarySubtle,
  },
  words: {
    flex: 1,
    gap: space.xxs,
  },
});
