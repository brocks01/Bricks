import { useId } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { color, screenPadding } from '@/theme';

export interface TintBackdropProps {
  /** The soft colour text sits on (contrast-checked in theme/tokens.test.ts). */
  tint: string;
  /**
   * A deep colour behind the cover at the very top (Luma's immersive event page).
   * When set, the backdrop scrolls with the page, so text always lands on the same
   * light part of it.
   */
  strong?: string;
}

/**
 * The event page's tint (Luma): the cover's colour at the top fading to the page grey.
 * Drawn with react-native-svg (no new native library). Purely decorative.
 *
 * With `strong`, the deep colour only sits behind the cover: it has faded fully into
 * the soft tint by the bottom edge of a full-width square cover, which is above the
 * title on every phone width (the title always follows the cover).
 */
export function TintBackdrop({ tint, strong }: TintBackdropProps) {
  const { width, height } = useWindowDimensions();
  // Unique per page: on the web every mounted page shares one document, and a
  // repeated gradient id would paint every page in the first page's colour.
  const id = `tint-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  if (strong) {
    const coverBottom = Math.max(width - screenPadding * 2, 1);
    const band = Math.max(height, coverBottom * 2.5);
    const at = (px: number) => Math.min(px / band, 1);
    return (
      <View
        style={[styles.inScroll, { height: band }]}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <Svg width="100%" height={band}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={strong} stopOpacity={1} />
              <Stop offset={at(coverBottom * 0.55)} stopColor={strong} stopOpacity={1} />
              <Stop offset={at(coverBottom)} stopColor={tint} stopOpacity={1} />
              <Stop offset={at(coverBottom * 1.9)} stopColor={color.canvas} stopOpacity={1} />
              <Stop offset="1" stopColor={color.canvas} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height={band} fill={`url(#${id})`} />
        </Svg>
      </View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.fill]} pointerEvents="none" accessible={false}>
      <Svg width="100%" height={height}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tint} stopOpacity={1} />
            <Stop offset="0.55" stopColor={tint} stopOpacity={0.5} />
            <Stop offset="1" stopColor={color.canvas} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={height} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    backgroundColor: color.canvas,
  },
  // Inside the scrolling content: absolute insets start at the padding edge, so this
  // already reaches the screen edges.
  inScroll: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
