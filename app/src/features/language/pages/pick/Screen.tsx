import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '../../../../components/ui';
import { LANGUAGES, useLanguage } from '../../../../i18n';
import { chooseLanguage } from '../../choose';
import { El, useField, usePageWords } from '../../../../kit';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { languagePick as page } from './page';

export default function LanguagePick() {
  const w = usePageWords(page);
  const code = useLanguage();
  // The agent can set this choice by its key: fill language.pick.language with a language code.
  useField(page, 'language', code, (v) => void chooseLanguage(v as (typeof LANGUAGES)[number]['code']));

  return (
    <Screen title={w('heading')} back>
      <El page={page} id="language">
        {LANGUAGES.map((l) => {
          const selected = l.code === code;
          return (
            <Pressable
              key={l.code}
              onPress={() => void chooseLanguage(l.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.accent : colors.line, borderRadius: radius.button, paddingHorizontal: space.lg, marginBottom: space.sm }}
            >
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { color: colors.ink, fontWeight: '700' }]}>{l.native}</Text>
                <Text style={[type.small, { color: colors.muted }]}>{l.name}</Text>
              </View>
              <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={24} color={selected ? colors.accent : colors.muted} />
            </Pressable>
          );
        })}
      </El>
      <View />
    </Screen>
  );
}
