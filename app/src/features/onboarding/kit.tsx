// The building blocks of the onboarding screens, laid out like the reference: a Back pill (with the title beside it, or the step label and a big title below),
// white cards and pill chips, one "Say it instead" pill inside the screen, and one wide button at the bottom. Our own colours and icons.
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { audioAvailable } from '../../agent/audio';
import { startTalk } from '../../agent/live';
import { colors, radius, space, tints, type } from '../../theme/tokens';

export type Icon = keyof typeof Ionicons.glyphMap;
const PILL = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill } as const;

/** The screen: Back on top (with the title beside it, or the step label and title below), the content, and the wide buttons at the bottom. */
export function Frame({ title, inlineTitle, step, hint, onBack, backLabel, primary, secondary, top, children }: {
  title?: string; inlineTitle?: boolean; step?: string; hint?: string; onBack?: () => void; backLabel?: string;
  primary?: { label: string; onPress: () => void; icon?: Icon; disabled?: boolean }; secondary?: { label: string; onPress: () => void }; top?: ReactNode; children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: space.lg, paddingBottom: 200 }}>
        {top}
        {onBack || (inlineTitle && title) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm }}>
            {onBack ? (
              <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={backLabel} style={[PILL, { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 12, paddingRight: 18 }]}>
                <Ionicons name="chevron-back" size={22} color={colors.ink} accessible={false} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{backLabel}</Text>
              </Pressable>
            ) : null}
            {inlineTitle && title ? <Text accessibilityRole="header" style={{ flex: 1, fontSize: 24, fontWeight: '800', color: colors.ink }}>{title}</Text> : null}
          </View>
        ) : null}
        {step ? <Text style={[type.small, { color: colors.muted, fontWeight: '600', marginTop: space.xs }]}>{step}</Text> : null}
        {!inlineTitle && title ? <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, fontWeight: '800', color: colors.ink, marginTop: step ? space.xs : space.sm }}>{title}</Text> : null}
        {hint ? <Text style={[type.body, { color: colors.muted, marginTop: space.sm }]}>{hint}</Text> : null}
        <View style={{ height: space.md }} />
        {children}
      </ScrollView>
      {primary || secondary ? (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 66 + insets.bottom, gap: space.sm, backgroundColor: colors.bg }}>
          {primary ? <Bar label={primary.label} icon={primary.icon} onPress={primary.onPress} disabled={primary.disabled} /> : null}
          {secondary ? <Bar light label={secondary.label} onPress={secondary.onPress} /> : null}
        </View>
      ) : null}
    </View>
  );
}

/** The wide bottom button: filled for the main action, white for "Skip for now" and "Later". */
export function Bar({ label, onPress, light, icon, disabled }: { label: string; onPress: () => void; light?: boolean; icon?: Icon; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 18, backgroundColor: light ? colors.card : colors.accent, borderWidth: light ? 1 : 0, borderColor: colors.line, opacity: disabled ? 0.5 : 1 }}>
      {icon ? <Ionicons name={icon} size={22} color={light ? colors.ink : colors.card} accessible={false} /> : null}
      <Text style={{ fontSize: 19, fontWeight: '800', color: light ? colors.ink : colors.card }}>{label}</Text>
    </Pressable>
  );
}

/** A choice with a round tick, like the text-size cards. */
export function RadioCard({ title, line, on, onPress }: { title: string; line?: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ minHeight: 88, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, marginBottom: space.md, borderRadius: radius.card, backgroundColor: colors.card, borderWidth: on ? 3 : 1, borderColor: on ? colors.accent : colors.line }}>
      <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={32} color={on ? colors.accent : colors.ink} accessible={false} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 21, fontWeight: '800', color: colors.ink }}>{title}</Text>
        {line ? <Text style={[type.body, { color: colors.muted, marginTop: 2 }]}>{line}</Text> : null}
      </View>
    </Pressable>
  );
}

/** A card with an icon on the left and a chevron on the right (who is setting up, how to remind you). */
export function ListCard({ icon, title, line, note, onPress, disabled }: { icon: Icon; title: string; line?: string; note?: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={{ minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, marginBottom: space.md, borderRadius: radius.card, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, opacity: disabled ? 0.75 : 1 }}>
      <View style={{ width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: tints.green }}>
        <Ionicons name={icon} size={30} color={colors.ink} accessible={false} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>{title}</Text>
        {line ? <Text style={[type.body, { color: colors.muted, marginTop: 2 }]}>{line}</Text> : null}
        {note ? <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink, marginTop: 6 }}>{note}</Text> : null}
      </View>
      {disabled ? null : <Ionicons name="chevron-forward" size={26} color={colors.ink} accessible={false} />}
    </Pressable>
  );
}

/** A pill (two per row): the chosen one is filled and shows a tick. */
export function Chip({ label, on, onPress, full }: { label: string; on: boolean; onPress: () => void; full?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ flexBasis: full ? '100%' : '47%', flexGrow: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: on ? colors.accent : colors.card, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}>
      {on ? <Ionicons name="checkmark" size={22} color={colors.card} accessible={false} /> : null}
      <Text style={{ fontSize: 19, fontWeight: '800', color: on ? colors.card : colors.ink, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

/** An interest tile: a small round icon and a word, many may be chosen. */
export function Interest({ icon, label, on, onPress }: { icon: Icon; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ flexBasis: '47%', flexGrow: 1, minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm, paddingVertical: space.sm, borderRadius: 16, backgroundColor: on ? colors.accentSoft : colors.card, borderWidth: on ? 2 : 1, borderColor: on ? colors.accent : colors.line }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : tints.green }}>
        <Ionicons name={icon} size={22} color={on ? colors.card : colors.ink} accessible={false} />
      </View>
      <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.ink }}>{label}</Text>
    </Pressable>
  );
}

/** "Say it instead": starts a talk with the agent, so the answer can be spoken in any language. It sits inside the screen, under the question. */
export function SayIt({ label }: { label: string }) {
  return (
    <Pressable onPress={() => void startTalk({ mic: audioAvailable() })} accessibilityRole="button" accessibilityLabel={label} style={[PILL, { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: space.md }]}>
      <Ionicons name="mic-outline" size={22} color={colors.ink} accessible={false} />
      <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink }}>{label}</Text>
    </Pressable>
  );
}

export const grid = { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: space.sm };

/** The scatter of tilted icon tiles above the language screen: what people do together here. */
const TILES: { icon: Icon; bg: string; size: number; left: number; top: number; turn: string }[] = [
  { icon: 'walk-outline', bg: '#3FA66B', size: 70, left: 8, top: 22, turn: '-10deg' },
  { icon: 'restaurant-outline', bg: '#F0743E', size: 66, left: 92, top: 0, turn: '6deg' },
  { icon: 'musical-notes-outline', bg: '#E8508F', size: 66, left: 188, top: 34, turn: '-6deg' },
  { icon: 'extension-puzzle-outline', bg: '#7B5BE6', size: 62, left: 270, top: 8, turn: '8deg' },
  { icon: 'leaf-outline', bg: '#6DBB3F', size: 62, left: 52, top: 96, turn: '7deg' },
  { icon: 'body-outline', bg: '#3F6FE0', size: 66, left: 140, top: 100, turn: '-8deg' },
  { icon: 'book-outline', bg: '#F5B73C', size: 64, left: 232, top: 104, turn: '5deg' },
];
export function Collage() {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ height: 176, marginBottom: space.md }}>
      {TILES.map((t, i) => (
        <View key={i} style={{ position: 'absolute', left: t.left, top: t.top, width: t.size, height: t.size, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg, transform: [{ rotate: t.turn }], shadowColor: '#000000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}>
          <Ionicons name={t.icon} size={t.size * 0.52} color="#FFFFFF" />
        </View>
      ))}
    </View>
  );
}
