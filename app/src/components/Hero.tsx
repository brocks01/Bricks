import { ImageSourcePropType, Image, Text, View } from 'react-native';
import { colors, radius, space } from '../theme/tokens';

/**
 * A photo banner with a title and a line on the left, as at the top of the sample screens (Grow, Explore, a category).
 * The picture is a local file; pass the person in the picture on the RIGHT so the words have calm space on the left.
 * `light` puts a soft white wash behind the words so they stay readable on any picture.
 */
export function Hero({ source, title, subtitle, height = 180, light = true }: { source: ImageSourcePropType; title?: string; subtitle?: string; height?: number; light?: boolean }) {
  return (
    <View style={{ height, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.accentSoft, marginBottom: space.md }}>
      <Image source={source} accessibilityIgnoresInvertColors resizeMode="cover" style={{ position: 'absolute', width: '100%', height: '100%' }} />
      {light ? (
        <>
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '78%', backgroundColor: 'rgba(255,255,255,0.28)' }} />
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '60%', backgroundColor: 'rgba(255,255,255,0.28)' }} />
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '42%', backgroundColor: 'rgba(255,255,255,0.28)' }} />
        </>
      ) : null}
      <View style={{ flex: 1, justifyContent: 'flex-start', padding: space.lg, maxWidth: '62%' }}>
        {title ? <Text accessibilityRole="header" style={{ fontSize: 32, fontWeight: '800', color: colors.ink }}>{title}</Text> : null}
        {subtitle ? <Text style={{ fontSize: 15, lineHeight: 21, color: '#1F2A44', marginTop: 4 }}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}
