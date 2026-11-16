import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';
import type { EventSource } from '../../api/home';
import { colors, radius, space } from '../../theme/tokens';

type IconName = keyof typeof Ionicons.glyphMap;

/** Where an event comes from: each its own icon, word and colour, so the tag never relies on colour alone. */
export const SOURCE_TAG: Record<EventSource, { icon: IconName; word: string; bg: string; fg: string }> = {
  community: { icon: 'people', word: 'tag_community', bg: '#E4EBF5', fg: '#1B3A66' },
  market: { icon: 'storefront', word: 'tag_market', bg: '#FBE7DC', fg: '#8F3B1A' },
  wisdom: { icon: 'book', word: 'tag_wisdom', bg: '#E2F0E6', fg: '#1E5E3A' },
};
export const PICTURE = 84; // the same size on every card that has a picture

/** The small pill in a card's top-right corner that says where the event comes from. */
export function SourceTag({ source, label }: { source: EventSource; label: string }) {
  const s = SOURCE_TAG[source];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: s.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Ionicons name={s.icon} size={16} color={s.fg} accessible={false} />
      <Text style={{ fontSize: 15, fontWeight: '800', color: s.fg }}>{label}</Text>
    </View>
  );
}

/**
 * One upcoming event. The time in words and the source tag share the top line (the tag in the top-right corner), so the title, below them,
 * always has its own full line to wrap on and is never covered. The picture is on the right, only when the event has one.
 */
export function EventCard({ source, tagLabel, when, title, lines, going, goingLabel, imageUrl, onPress, a11y }: {
  source: EventSource; tagLabel: string; when: string; title: string; lines: string[]; going: boolean; goingLabel: string; imageUrl: string | null; onPress: () => void; a11y: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => ({ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, marginBottom: space.md, gap: space.sm, opacity: pressed ? 0.9 : 1 })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
        <Text style={{ flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '800', color: colors.accentDark }}>{when}</Text>
        <SourceTag source={source} label={tagLabel} />
      </View>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 21, lineHeight: 27, fontWeight: '800', color: colors.ink }}>{title}</Text>
          {lines.map((l) => (
            <Text key={l} style={{ fontSize: 18, lineHeight: 25, color: colors.ink }}>{l}</Text>
          ))}
          {going ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Ionicons name="checkmark-circle" size={22} color="#1E7A46" accessible={false} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#1E7A46' }}>{goingLabel}</Text>
            </View>
          ) : null}
        </View>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} accessibilityIgnoresInvertColors style={{ width: PICTURE, height: PICTURE, borderRadius: radius.button, backgroundColor: colors.bone }} resizeMode="cover" />
        ) : null}
      </View>
    </Pressable>
  );
}
