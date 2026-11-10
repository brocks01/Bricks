import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { color, iconSize, motion } from '@/theme';

import type { Icon } from './primitives/icons';

export interface PhotoHeaderProps {
  photoUrl: string | null;
  /** Shown on a light-grey panel when there is no photo, or it fails to load. */
  fallbackIcon: Icon;
  /** Width ÷ height. 16:9 for events (Luma), 2:1 for circle banners. */
  aspectRatio?: number;
}

/**
 * Real local photography when we have it (docs/02 §5.4); otherwise a large
 * category icon, never clip-art. Same size either way, so lists stay even.
 */
export function PhotoHeader({
  photoUrl,
  fallbackIcon: FallbackIcon,
  aspectRatio = 16 / 9,
}: PhotoHeaderProps) {
  const [failed, setFailed] = useState(false);

  if (photoUrl && !failed) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[styles.media, { aspectRatio }]}
        contentFit="cover"
        transition={motion.base}
        accessible={false}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[styles.media, styles.fallback, { aspectRatio }]} accessible={false}>
      <FallbackIcon size={iconSize.hero * 1.5} color={color.primary} weight="regular" />
    </View>
  );
}

const styles = StyleSheet.create({
  media: {
    width: '100%',
    backgroundColor: color.bgSubtle,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
