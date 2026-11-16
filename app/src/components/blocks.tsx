import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors, radius, size, space, tints, type } from '../theme/tokens';

// Small building blocks the four main tabs share, so they look like one app. Colours and sizes come from the tokens only; no words of their own.
type IconName = keyof typeof Ionicons.glyphMap;
const tintFor = (i: number) => Object.values(tints)[i % Object.values(tints).length];

/** A section title with an optional action on the right ("See all"). */
export function Section({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: ReactNode }) {
  return (
    <View style={{ marginTop: space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
        <Text style={[type.h2, { color: colors.ink }]} accessibilityRole="header">{title}</Text>
        {action && onAction ? (
          <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8} style={{ minHeight: size.touch, justifyContent: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.accent }}>{action}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** A white card; pass `tone` for the soft green or the amber "pay attention" version. */
export function Panel({ children, tone, onPress, label }: { children: ReactNode; tone?: 'soft' | 'warn'; onPress?: () => void; label?: string }) {
  const style = {
    backgroundColor: tone === 'soft' ? colors.accentSoft : tone === 'warn' ? colors.warnSoft : colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: tone === 'soft' ? colors.accentLine : tone === 'warn' ? colors.warn : colors.line,
    padding: space.md,
    marginBottom: space.sm,
  } as const;
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={style}>{children}</Pressable>
  ) : (
    <View style={style}>{children}</View>
  );
}

/** A symbol on a soft tinted square. */
export function Tile({ icon, i = 0, dim = size.thumb }: { icon: IconName; i?: number; dim?: number }) {
  return (
    <View style={{ width: dim, height: dim, borderRadius: radius.button, backgroundColor: tintFor(i), alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={dim * 0.5} color={colors.accent} accessible={false} />
    </View>
  );
}

/** A row: tile, title and a line under it, an optional right side. Tap it when `onPress` is given. */
export function ListRow({ icon, i, title, sub, right, onPress, rightIsButton }: { icon: IconName; i?: number; title: string; sub?: string; right?: ReactNode; onPress?: () => void; rightIsButton?: boolean }) {
  // A button inside a button is invalid on the web: when the right side has its own buttons, only the left part (picture and words) is the tap target.
  if (onPress && rightIsButton) {
    return (
      <Panel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <Tile icon={icon} i={i} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }} numberOfLines={2}>{title}</Text>
              {sub ? <Text style={[type.small, { color: colors.muted, marginTop: 2 }]} numberOfLines={2}>{sub}</Text> : null}
            </View>
          </Pressable>
          {right}
        </View>
      </Panel>
    );
  }
  return (
    <Panel onPress={onPress} label={title}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Tile icon={icon} i={i} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }} numberOfLines={2}>{title}</Text>
          {sub ? <Text style={[type.small, { color: colors.muted, marginTop: 2 }]} numberOfLines={2}>{sub}</Text> : null}
        </View>
        {right}
      </View>
    </Panel>
  );
}

/** One row of choices that scrolls sideways (for long lists such as the kinds of service); the chosen one is green. */
export function ChipRow<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingRight: space.lg }} style={{ marginBottom: space.md, flexGrow: 0 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: size.touch, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: on ? colors.accent : colors.card, borderWidth: 1, borderColor: on ? colors.accent : colors.line, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: on ? colors.card : colors.ink }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** A small rounded label. */
export function Pill({ text, tone }: { text: string; tone?: 'soft' | 'warn' | 'quiet' }) {
  const bg = tone === 'warn' ? colors.warnSoft : tone === 'quiet' ? colors.bg : colors.accentSoft;
  const fg = tone === 'warn' ? colors.warn : tone === 'quiet' ? colors.muted : colors.accent;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: fg }}>{text}</Text>
    </View>
  );
}

/** A line of notice: info (green) or warning (amber). */
export function Notice({ text, tone = 'soft', icon }: { text: string; tone?: 'soft' | 'warn'; icon?: IconName }) {
  return (
    <Panel tone={tone}>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <Ionicons name={icon ?? (tone === 'warn' ? 'alert-circle-outline' : 'information-circle-outline')} size={size.icon.md} color={tone === 'warn' ? colors.warn : colors.accent} accessible={false} />
        <Text style={[type.small, { flex: 1, color: colors.ink }]}>{text}</Text>
      </View>
    </Panel>
  );
}

/** Nothing here yet: a quiet message. */
export function Empty({ text }: { text: string }) {
  return <Text style={[type.body, { color: colors.muted, textAlign: 'center', paddingVertical: space.xl }]}>{text}</Text>;
}

/** A thin progress bar from 0 to 1. */
export function Bar({ value }: { value: number }) {
  return (
    <View style={{ height: size.bar, borderRadius: radius.pill, backgroundColor: colors.line, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: size.bar, backgroundColor: colors.accent }} />
    </View>
  );
}

/** A big number with a label under it, for the small summary boxes. */
export function Figure({ n, label, icon }: { n: string | number; label: string; icon?: IconName }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.md, borderRadius: radius.card, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
      {icon ? <Ionicons name={icon} size={size.icon.md} color={colors.accent} accessible={false} /> : null}
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>{n}</Text>
      <Text style={[type.small, { color: colors.muted, textAlign: 'center' }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}
