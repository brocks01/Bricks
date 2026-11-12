import { Image } from 'expo-image';
import { useId, useState, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { color, motion, posterColor, radius, space, type CategoryColorKey } from '@/theme';

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
 * Luma's square cover: the event's photo, or our own poster art (a bold
 * gradient in the category's colours with a big white icon). Same size either way.
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
  const poster = posterColor[tint];
  const gradientId = `poster-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const r = rounded === 'card' ? radius.card : radius.tile;
  const iconPx = typeof size === 'number' ? Math.round(size * 0.5) : 136;
  const showPhoto = !!photoUrl && !failed;

  return (
    <View
      style={[styles.frame, { width: size, borderRadius: r, backgroundColor: poster.to }]}
      accessible={false}
    >
      {showPhoto ? null : (
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={poster.from} />
              <Stop offset="1" stopColor={poster.to} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill={`url(#${gradientId})`} />
          {/* Two soft rings give the poster depth, like light on a printed card. */}
          <Circle cx="88" cy="10" r="34" fill={color.textOnColor} fillOpacity={0.14} />
          <Circle cx="6" cy="96" r="26" fill={color.textOnColor} fillOpacity={0.1} />
        </Svg>
      )}
      {showPhoto ? (
        <Image
          source={{ uri: photoUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={motion.base}
          onError={() => setFailed(true)}
        />
      ) : (
        // In its own view so it paints above the absolutely placed gradient (web).
        <View>
          <IconComponent size={iconPx} color={color.textOnColor} weight="fill" />
        </View>
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
