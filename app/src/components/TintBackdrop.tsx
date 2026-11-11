import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { color } from '@/theme';

/**
 * The event page's tint (Luma): the cover's colour at the top fading to white.
 * Drawn with react-native-svg (no new native library). Purely decorative; text on
 * it uses colours checked for contrast against every tint (theme/tokens.test.ts).
 */
export function TintBackdrop({ tint }: { tint: string }) {
  const { height } = useWindowDimensions();
  return (
    <View style={[StyleSheet.absoluteFill, styles.fill]} pointerEvents="none" accessible={false}>
      <Svg width="100%" height={height}>
        <Defs>
          <LinearGradient id="tint" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tint} stopOpacity={1} />
            <Stop offset="0.55" stopColor={tint} stopOpacity={0.5} />
            <Stop offset="1" stopColor={color.bg} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={height} fill="url(#tint)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    backgroundColor: color.bg,
  },
});
