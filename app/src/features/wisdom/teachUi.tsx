// The look shared by the revamp v2 Wisdom screens (A2): a person's initials, a section heading, a status word, big buttons, a card, a calm message.
// Large text and large targets: every button is at least 56 high and says what it does in words, with its icon.
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { IconName } from '../../components/ui';
import { colors, radius, space, tints } from '../../theme/tokens';
import './teachWords'; // registers the words used as t('wt.…')

export const BLUE = '#1F4E9E'; // Wisdom's colour
export const card = { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md } as const;

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '?';

/** A person's (or a group's) initials in a circle; a group gets the group icon. There are no profile photos yet, so never a picture. */
export function Avatar({ name, size = 52, group }: { name: string; size?: number; group?: boolean }) {
  return (
    <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: group ? '#EEEBFA' : tints.sky }}>
      {group ? <Ionicons name="people" size={size * 0.5} color="#5B3FB8" /> : <Text style={{ fontSize: size * 0.38, fontWeight: '800', color: BLUE }}>{initials(name)}</Text>}
    </View>
  );
}

export function Heading({ text, right, onRight }: { text: string; right?: string; onRight?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginTop: space.xl, marginBottom: space.md }}>
      <Text accessibilityRole="header" style={{ flexShrink: 1, fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.ink }}>{text}</Text>
      {right && onRight ? (
        <Pressable onPress={onRight} accessibilityRole="button" hitSlop={8} style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: space.sm }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: BLUE }}>{right}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SubHeading({ text }: { text: string }) {
  return <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '800', color: colors.navy, marginTop: space.md, marginBottom: space.sm }}>{text}</Text>;
}

/** A small word that says what state something is in: active (green), coming up (blue), completed (grey). */
export function StatusWord({ text, tone }: { text: string; tone: 'active' | 'soon' | 'done' }) {
  const c = tone === 'active' ? { bg: '#E3F4EA', fg: '#1D6B3F' } : tone === 'soon' ? { bg: tints.sky, fg: BLUE } : { bg: '#EDEFF3', fg: colors.muted };
  return (
    <View style={{ alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: c.fg }}>{text}</Text>
    </View>
  );
}

/** One big button: filled (the main thing to do) or outlined. */
export function BigButton({ label, icon, onPress, kind = 'fill', disabled, busy, tone = BLUE }: { label: string; icon?: IconName; onPress: () => void; kind?: 'fill' | 'outline'; disabled?: boolean; busy?: boolean; tone?: string }) {
  const fill = kind === 'fill';
  return (
    <Pressable onPress={onPress} disabled={disabled || busy} accessibilityRole="button" accessibilityState={{ disabled: !!(disabled || busy) }} accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: space.md, borderRadius: radius.button,
        backgroundColor: fill ? tone : colors.card, borderWidth: 2, borderColor: fill ? tone : colors.line, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 })}>
      {busy ? <ActivityIndicator color={fill ? colors.card : tone} /> : icon ? <Ionicons name={icon} size={24} color={fill ? colors.card : tone} accessible={false} /> : null}
      <Text style={{ flexShrink: 1, fontSize: 18, fontWeight: '800', color: fill ? colors.card : tone, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export function Calm({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <View style={[card, { padding: space.lg, gap: space.md }]}>
      <Text style={{ fontSize: 18, lineHeight: 26, color: colors.ink }}>{text}</Text>
      {children}
    </View>
  );
}

/** A short line that says how something went, with a tick (or a cross). */
export function Result({ text, ok = true }: { text: string; ok?: boolean }) {
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm }}>
      <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={28} color={ok ? '#1D6B3F' : colors.muted} accessible={false} />
      <Text style={{ flex: 1, fontSize: 18, lineHeight: 25, fontWeight: '700', color: colors.ink }}>{text}</Text>
    </View>
  );
}
