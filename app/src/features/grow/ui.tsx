import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { colors, radius, space, type } from '../../theme/tokens';

// Small pieces shared by the Grow screens. No words of their own.

/** A row of choices; the chosen one is green. */
export function Chips<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: radius.button, backgroundColor: on ? colors.accent : colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14.5, fontWeight: '700', color: on ? '#FFFFFF' : colors.accent }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Card({ children, onPress, tone }: { children: React.ReactNode; onPress?: () => void; tone?: 'soft' }) {
  const style = { backgroundColor: tone === 'soft' ? colors.accentSoft : colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: tone === 'soft' ? colors.accentLine : colors.line, padding: space.md, marginBottom: space.sm } as const;
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button" style={style}>{children}</Pressable> : <View style={style}>{children}</View>;
}

/** A big number with a label, for the small summary boxes. */
export function Stat({ icon, n, label }: { icon: keyof typeof Ionicons.glyphMap; n: string | number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.card, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
      <Ionicons name={icon} size={22} color={colors.accent} />
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>{n}</Text>
      <Text style={[type.small, { color: colors.muted }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/** Seven small bars, one per day, oldest first. The tallest is the busiest day. */
export function WeekBars({ days }: { days: { date: string; minutes: number }[] }) {
  const max = Math.max(30, ...days.map((d) => d.minutes));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 90, marginBottom: space.md }}>
      {days.map((d) => (
        <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <View style={{ width: '100%', height: Math.max(4, Math.round((d.minutes / max) * 64)), borderRadius: 6, backgroundColor: d.minutes ? colors.accent : colors.accentSoft }} />
          <Text style={{ fontSize: 11, color: colors.muted }}>{new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' })}</Text>
        </View>
      ))}
    </View>
  );
}

export const num = (s: string) => {
  const v = parseFloat(s.replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? v : null;
};
