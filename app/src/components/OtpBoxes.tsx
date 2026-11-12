import { type ComponentRef, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { colors, radius, space, type } from '../theme/tokens';

/** The code entry: one box per digit. A single invisible input lies over the row, so typing, deleting, pasting and the phone's
 *  "code from your email" suggestion all work as in any text field; the boxes only show what was typed. */
export function OtpBoxes({ label, value, onChange, length = 6, error }: { label: string; value: string; onChange: (v: string) => void; length?: number; error?: boolean }) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  const here = Math.min(value.length, length - 1); // the box that is waiting for the next digit
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={[type.small, { color: colors.ink, fontWeight: '700', marginBottom: space.sm }]}>{label}</Text>
      <Pressable onPress={() => input.current?.focus()} accessible={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} pointerEvents="none">
          {Array.from({ length }, (_, i) => {
            const on = focused && i === here;
            return (
              <View
                key={i}
                style={{
                  width: 48,
                  height: 60,
                  borderRadius: radius.button,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? colors.accentSoft : colors.card,
                  borderWidth: on || error ? 2 : 1.5,
                  borderColor: error ? colors.danger : on ? colors.accent : value[i] ? colors.accentLine : colors.line,
                }}
              >
                <Text style={{ fontSize: 28, fontWeight: '700', color: colors.ink }}>{value[i] ?? ''}</Text>
              </View>
            );
          })}
        </View>
        <TextInput
          ref={input}
          value={value}
          onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, length))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="number-pad"
          maxLength={length}
          autoFocus
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          accessibilityLabel={label}
          caretHidden
          selectionColor="transparent"
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, fontSize: 28 }, { outlineStyle: 'none' } as object]}
        />
      </Pressable>
    </View>
  );
}
