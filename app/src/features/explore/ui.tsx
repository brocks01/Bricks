import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';
import type { ExploreFormat, ExploreItem } from '../../api/explore';
import { colors, radius, space, type } from '../../theme/tokens';

// Small pieces shared by the Explore screens. No words of their own: callers pass them in, already in the person's language.

const TINTS = ['#E3F1E7', '#E8E6F8', '#E6F4E1', '#FBEFD9'];
export const FORMAT_ICON: Record<ExploreFormat, keyof typeof Ionicons.glyphMap> = {
  guide: 'document-text-outline', video: 'play-circle-outline', interactive: 'hand-left-outline', story: 'book-outline', audio: 'headset-outline', activity: 'sparkles-outline',
};
export const symbol = (name: string, fallback: keyof typeof Ionicons.glyphMap = 'compass-outline') => (name in (Ionicons.glyphMap as Record<string, unknown>) ? (name as keyof typeof Ionicons.glyphMap) : fallback);

export function Pic({ uri, icon, size, i = 0, radiusPx = 14 }: { uri?: string | null; icon: keyof typeof Ionicons.glyphMap; size: number; i?: number; radiusPx?: number }) {
  if (uri) return <Image source={{ uri }} accessibilityIgnoresInvertColors style={{ width: size, height: size, borderRadius: radiusPx, backgroundColor: TINTS[i % TINTS.length] }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: radiusPx, backgroundColor: TINTS[i % TINTS.length], alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={size * 0.45} color={colors.accent} />
    </View>
  );
}

/** One item in a list: a picture, the title, "8 min · Guide", and a bookmark. */
export function ItemRow({ item, i, meta, onOpen, onSave, saveLabel }: { item: ExploreItem; i: number; meta: string; onOpen: () => void; onSave?: () => void; saveLabel?: string }) {
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.sm, marginBottom: space.sm }}>
      <Pic uri={item.image_url} icon={FORMAT_ICON[item.format]} size={64} i={i} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{item.title}</Text>
        <Text style={[type.small, { color: colors.muted, marginTop: 2 }]}>{meta}</Text>
        {item.percent > 0 && !item.completed ? (
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.accentSoft, marginTop: 6 }}>
            <View style={{ width: `${item.percent}%`, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
          </View>
        ) : null}
      </View>
      {item.completed ? <Ionicons name="checkmark-circle" size={22} color={colors.accent} /> : null}
      {onSave ? (
        <Pressable onPress={onSave} accessibilityRole="button" accessibilityLabel={saveLabel} hitSlop={10}>
          <Ionicons name={item.saved ? 'bookmark' : 'bookmark-outline'} size={24} color={colors.accent} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return <Text style={[type.h2, { color: colors.ink, marginTop: space.lg, marginBottom: space.sm }]}>{children}</Text>;
}
