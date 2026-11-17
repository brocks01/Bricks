import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, radius, space } from '../../theme/tokens';

type IconName = keyof typeof Ionicons.glyphMap;
const GREEN = '#1E7A46';

/** Where a market day stands for the person: going, waiting for "Did you go?", or answered. An icon and a word, never colour alone. */
export type DayState = 'going' | 'ask' | 'went' | 'didnt';
const PILL: Record<DayState, { icon: IconName; bg: string; fg: string; word: string }> = {
  going: { icon: 'checkmark-circle', bg: '#E4EBF5', fg: '#1B3A66', word: 'pill_going' },
  ask: { icon: 'help-circle', bg: '#FDF1D6', fg: '#7A4E00', word: 'pill_ask' },
  went: { icon: 'checkmark-done-circle', bg: '#E2F0E6', fg: GREEN, word: 'pill_went' },
  didnt: { icon: 'close-circle', bg: '#EEF0F3', fg: '#3E4A5C', word: 'pill_didnt' },
};
export const stateOf = (i_going: boolean, started: boolean, attended: boolean | null): DayState | null =>
  attended === true ? 'went' : attended === false ? 'didnt' : !i_going ? null : started ? 'ask' : 'going';

export function StatePill({ state, w }: { state: DayState; w: (id: string) => string }) {
  const p = PILL[state];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: p.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
      <Ionicons name={p.icon} size={18} color={p.fg} accessible={false} />
      <Text style={{ fontSize: 16, fontWeight: '800', color: p.fg }}>{w(p.word)}</Text>
    </View>
  );
}

/** The two answers after the day, side by side and equal: a filled green tick "I went" and an outlined cross "I didn't go". Words wrap, buttons stay side by side. */
export function AnswerButtons({ onAnswer, busy, w, wrap = (_, n) => n }: { onAnswer: (went: boolean) => void; busy?: boolean; w: (id: string) => string; wrap?: (which: 'went' | 'didnt', node: ReactNode) => ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <View style={{ flex: 1 }}>{wrap('went', (
      <Pressable onPress={() => onAnswer(true)} disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: !!busy }} style={({ pressed }) => ({ minHeight: 56, borderRadius: radius.button, backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: space.sm, paddingVertical: 8, opacity: busy ? 0.6 : pressed ? 0.85 : 1 })}>
        <Ionicons name="checkmark" size={26} color={colors.card} accessible={false} />
        <Text style={{ flexShrink: 1, fontSize: 19, fontWeight: '800', color: colors.card, textAlign: 'center' }}>{w('i_went')}</Text>
      </Pressable>))}</View>
      <View style={{ flex: 1 }}>{wrap('didnt', (
      <Pressable onPress={() => onAnswer(false)} disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: !!busy }} style={({ pressed }) => ({ minHeight: 56, borderRadius: radius.button, borderWidth: 2, borderColor: colors.ink, backgroundColor: pressed ? colors.bg : colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: space.sm, paddingVertical: 8, opacity: busy ? 0.6 : 1 })}>
        <Ionicons name="close" size={26} color={colors.ink} accessible={false} />
        <Text style={{ flexShrink: 1, fontSize: 19, fontWeight: '800', color: colors.ink, textAlign: 'center' }}>{w('i_didnt')}</Text>
      </Pressable>))}</View>
    </View>
  );
}

/** A small link to change an answer, still at least 48 high. */
export function ChangeLink({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={6} style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.accentDark, textDecorationLine: 'underline' }}>{label}</Text>
    </Pressable>
  );
}

/** A short message near the bottom of the screen that goes by itself ("Thank you, noted."). Screen readers hear it. */
export function useToast(): [string | null, (m: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const h = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(h);
  }, [msg]);
  return [msg, setMsg];
}
export function Toast({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <View style={{ pointerEvents: 'none', position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, alignItems: 'center' }}>
      <View accessibilityLiveRegion="polite" role="status" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 12 }}>
        <Ionicons name="checkmark-circle" size={22} color="#7BD39A" accessible={false} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.card }}>{msg}</Text>
      </View>
    </View>
  );
}
