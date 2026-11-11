import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';

import { categoryColor, motion, radius, space, type CategoryColorKey } from '@/theme';

import type { Icon } from './primitives/icons';

export interface CoverArtProps {
  photoUrl: string | null;
  /** Shown on the category's soft colour when there's no photo (never clip-art). */
  icon: Icon;
  tint: CategoryColorKey;
  /** Width in dp, or '100%' for a full-width square. */
  size: DimensionValue;
  rounded?: 'tile' | 'card';
  /** Laid over the bottom-left corner (a StatusBadge). */
  overlay?: ReactNode;
}

/**
 * Luma's square cover: the event's photo, or our own category art (a soft
 * colour with the category icon in a deep shade). Same size either way.
 */
export function CoverArt({
  photoUrl,
  icon: IconComponent,
  tint,
  size,
  rounded = 'tile',
  overlay,
}: CoverArtProps) {
  const [failed, setFailed] = useState(false);
  const colours = categoryColor[tint];
  const r = rounded === 'card' ? radius.card : radius.tile;
  const iconPx = typeof size === 'number' ? Math.round(size * 0.46) : 120;

  return (
    <View
      style={[styles.frame, { width: size, borderRadius: r, backgroundColor: colours.bg }]}
      accessible={false}
    >
      {photoUrl && !failed ? (
        <Image
          source={{ uri: photoUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={motion.base}
          onError={() => setFailed(true)}
        />
      ) : (
        <IconComponent size={iconPx} color={colours.fg} weight="duotone" />
      )}
      {overlay ? <View style={styles.overlay}>{overlay}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    left: space.xs,
    bottom: space.xs,
  },
});
