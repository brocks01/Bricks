import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { KeyboardTypeOptions, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, space, type } from '../theme/tokens';
import { AppHeader, BackHeader } from './headers';

export type IconName = keyof typeof Ionicons.glyphMap;

/**
 * A page. Tab pages show the app header (logo, bell, avatar); inner pages show a back header with the page title;
 * `plain` pages (sign-in start, profile setup) show neither.
 */
export function Screen({ title, subtitle, children, back, plain }: { title: string; subtitle?: string; children: ReactNode; back?: boolean; plain?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {plain ? null : back ? <BackHeader title={title} /> : <AppHeader />}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: space.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {back ? null : <Text style={[type.h1, { color: colors.ink }]} accessibilityRole="header">{title}</Text>}
        {subtitle ? <Text style={[type.small, { color: colors.muted, marginTop: 2, marginBottom: space.md }]}>{subtitle}</Text> : <View style={{ height: space.md }} />}
        {children}
      </ScrollView>
    </View>
  );
}

export function Card({ title, children, tint }: { title?: string; children: ReactNode; tint?: boolean }) {
  return (
    <View style={[styles.card, tint && { backgroundColor: colors.accentSoft, borderColor: colors.accentLine }]}>
      {title ? <Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[type.body, { color: muted ? colors.muted : colors.ink }]}>{children}</Text>;
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return <Text accessibilityLiveRegion="polite" style={[type.small, { color: colors.danger, marginBottom: space.md, fontWeight: '600' }]}>{children}</Text>;
}

export function Button({ label, onPress, kind = 'primary', icon, disabled }: { label: string; onPress: () => void; kind?: 'primary' | 'plain' | 'danger'; icon?: IconName; disabled?: boolean }) {
  const primary = kind === 'primary';
  const danger = kind === 'danger';
  const fg = primary ? '#FFFFFF' : danger ? colors.danger : colors.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.btn, primary ? { backgroundColor: colors.accent } : { backgroundColor: colors.card, borderWidth: 2, borderColor: danger ? colors.danger : colors.accent }, (pressed || disabled) && { opacity: disabled ? 0.5 : 0.85 }]}
    >
      {icon ? <Ionicons name={icon} size={20} color={fg} style={{ marginRight: 8 }} /> : null}
      <Text style={{ fontSize: 18, fontWeight: '700', color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, placeholder, icon, error, keyboardType, autoCapitalize, maxLength, big }: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; icon?: IconName; error?: string | null; keyboardType?: KeyboardTypeOptions; autoCapitalize?: 'none' | 'sentences' | 'words'; maxLength?: number; big?: boolean }) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={[type.small, { color: colors.ink, fontWeight: '700', marginBottom: space.xs }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: error ? 2 : 1, borderColor: error ? colors.danger : colors.line, borderRadius: radius.button, paddingHorizontal: space.md }}>
        {icon ? <Ionicons name={icon} size={20} color={colors.muted} style={{ marginRight: 10 }} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          accessibilityLabel={label}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          style={{ flex: 1, fontSize: big ? 28 : 17, letterSpacing: big ? 8 : 0, fontWeight: big ? '700' : '400', paddingVertical: 14, color: colors.ink }}
        />
      </View>
      {error ? <Text style={[type.small, { color: colors.danger, marginTop: 4 }]}>{error}</Text> : null}
    </View>
  );
}

/** Large selectable chips for a short list of choices (for example the age group). */
export function ChoiceChips({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string | null; onChange: (v: string) => void }) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={[type.small, { color: colors.ink, fontWeight: '700', marginBottom: space.xs }]}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ minHeight: 48, paddingHorizontal: 18, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : colors.card, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: on ? '#FFFFFF' : colors.ink }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** A tappable row for settings: icon, a small label, the value, and a chevron. */
export function Row({ icon, label, value, onPress }: { icon: IconName; label: string; value: string; onPress?: () => void }) {
  const inner = (
    <>
      <Ionicons name={icon} size={24} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={[type.small, { color: colors.muted }]}>{label}</Text>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{value}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={22} color={colors.muted} /> : null}
    </>
  );
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.button, paddingHorizontal: space.lg, paddingVertical: 12, minHeight: 62, marginBottom: space.sm };
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={style}>{inner}</Pressable>
  ) : (
    <View style={style}>{inner}</View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, marginBottom: space.md },
  btn: { minHeight: 54, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg, flexDirection: 'row' },
});
