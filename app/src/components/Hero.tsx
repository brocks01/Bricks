import { ImageSourcePropType, Image, Text, View } from 'react-native';
import { colors, radius, space } from '../theme/tokens';

/**
 * A photo banner with a title and a line on the left, as at the top of the sample screens (Grow, Explore, a category).
 * The picture is a local file; pass the person in the picture on the RIGHT so the words have calm space on the left.
 * `light` puts a soft white wash behind the words so they stay readable on any picture.
 */
export function Hero({ source, title, subtitle, height = 140, light = true }: { source: ImageSourcePropType; title?: string; subtitle?: string; height?: number; light?: boolean }) {
  return (
    <View style={{ height, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.accentSoft, marginBottom: space.md }}>
      <Image source={source} accessibilityIgnoresInvertColors resizeMode="cover" style={{ position: 'absolute', width: '100%', height: '100%' }} />
      {light
        ? Array.from({ length: 14 }, (_, i) => (
            // Many thin washes of white, widest first, make a smooth fade from the left edge without needing a gradient library.
            <View key={i} pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${80 - i * 4.5}%`, backgroundColor: 'rgba(255,255,255,0.055)' }} />
          ))
        : null}
      <View style={{ flex: 1, justifyContent: 'flex-start', paddingHorizontal: space.lg, paddingVertical: space.md, maxWidth: '60%' }}>
        {title ? <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 28, fontWeight: '800', color: colors.ink }}>{title}</Text> : null}
        {subtitle ? <Text numberOfLines={3} style={{ fontSize: 13.5, lineHeight: 18, color: '#1F2A44', marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}
