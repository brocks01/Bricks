// The building blocks of the six first-time screens (welcome, language, Singpass, assistant, profile, all set), drawn like the reference design:
// warm paper, a green main button, the Interchange mark and name on top, and a row of dots at the bottom. One place, so every screen matches.
import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type Icon = keyof typeof Ionicons.glyphMap;
export const R = {
  bg: '#FBF8F2', card: '#FFFFFF', ink: '#0B2447', muted: '#4A5A73', line: '#E7E1D5',
  green: '#0E6B3D', greenSoft: '#E3F1E7', greenLine: '#9CCBAA', orange: '#F29A1F', peach: '#FDF1E3',
};
export const TOTAL_STEPS = 6;

/** The Interchange mark with the name beside it (the small header) or below it (the big welcome). */
export function Brand({ big }: { big?: boolean }) {
  const mark = require('../../../assets/brand/mark.png');
  return big ? (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Image source={mark} accessible={false} resizeMode="contain" style={{ width: 96, height: 68 }} />
      <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '800', color: R.ink }}>Interchange</Text>
    </View>
  ) : (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Image source={mark} accessible={false} resizeMode="contain" style={{ width: 52, height: 38 }} />
      <Text style={{ fontSize: 18, fontWeight: '800', color: R.ink }}>Interchange</Text>
    </View>
  );
}

/** The row of dots: the one for this screen is a longer green pill. */
export function Dots({ at }: { at: number }) {
  return (
    <View accessible={false} style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 }}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <View key={i} style={{ width: i === at ? 26 : 10, height: 8, borderRadius: 4, backgroundColor: i === at ? R.green : '#DCD6CA' }} />
      ))}
    </View>
  );
}

/** The wide green button. */
export function Go({ label, onPress, icon, trailing, disabled, light }: { label: string; onPress: () => void; icon?: Icon; trailing?: Icon; disabled?: boolean; light?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
      style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, backgroundColor: light ? R.card : R.green, borderWidth: light ? 1 : 0, borderColor: R.line, opacity: disabled ? 0.5 : 1 }}>
      {icon ? <Ionicons name={icon} size={22} color={light ? R.ink : '#FFFFFF'} accessible={false} /> : null}
      <Text style={{ fontSize: 19, fontWeight: '800', color: light ? R.ink : '#FFFFFF' }}>{label}</Text>
      {trailing ? <Ionicons name={trailing} size={22} color="#FFFFFF" accessible={false} /> : null}
    </Pressable>
  );
}

/** One screen: back arrow and brand on top, the content, then the button(s) and the dots fixed at the bottom (clear of the floating agent button). */
export function RefFrame({ at, onBack, backLabel, hideBrand, bottom, children }: { at: number; onBack?: () => void; backLabel?: string; hideBrand?: boolean; bottom?: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: R.bg, paddingTop: insets.top }}>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 220, width: '100%', maxWidth: 520, alignSelf: 'center' }}>
        {hideBrand ? null : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 48, marginBottom: 6 }}>
            {onBack ? (
              <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={backLabel} hitSlop={12} style={{ position: 'absolute', left: 0, width: 44, height: 44, justifyContent: 'center' }}>
                <Ionicons name="arrow-back" size={26} color={R.ink} accessible={false} />
              </Pressable>
            ) : null}
            <Brand />
          </View>
        )}
        {children}
      </ScrollView>
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 66 + insets.bottom, backgroundColor: R.bg, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 520, gap: 10 }}>
          {bottom}
          <Dots at={at} />
        </View>
      </View>
    </View>
  );
}

/** The big round green microphone (Tap to speak). */
export function MicButton({ onPress, label, hot }: { onPress: () => void; label: string; hot?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
        style={{ width: hot ? 92 : 80, height: hot ? 92 : 80, borderRadius: 46, backgroundColor: R.green, alignItems: 'center', justifyContent: 'center', borderWidth: hot ? 6 : 0, borderColor: R.greenLine }}>
        <Ionicons name="mic" size={38} color="#FFFFFF" accessible={false} />
      </Pressable>
      <Text style={{ fontSize: 18, fontWeight: '700', color: R.ink, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}
