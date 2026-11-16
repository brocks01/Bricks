import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '../../../../components/ui';
import { LANGUAGES, useLanguage } from '../../../../i18n';
import { chooseLanguage } from '../../choose';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { colors, radius, space } from '../../../../theme/tokens';
import { languagePick as page } from './page';

export default function LanguagePick() {
  const w = usePageWords(page);
  const code = useLanguage();
  const [picked, setPicked] = useState(code);
  useField(page, 'language', picked, (v) => { setPicked(v as (typeof LANGUAGES)[number]['code']); void chooseLanguage(v as (typeof LANGUAGES)[number]['code']); });
  useAction(page, 'done', () => { void chooseLanguage(picked); });

  return (
    <Screen title={w('heading')} back>
      <El page={page} id="language">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md }}>
          {LANGUAGES.map((l) => {
            const selected = l.code === picked;
            return (
              <Pressable key={l.code} onPress={() => { setPicked(l.code); void chooseLanguage(l.code); }} accessibilityRole="radio" accessibilityState={{ selected }}
                style={{ flexBasis: '48%', minHeight: 72, padding: space.md, borderRadius: radius.button, backgroundColor: selected ? colors.navy : colors.card, borderWidth: selected ? 2 : 1, borderColor: selected ? colors.navy : colors.line, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: selected ? '#FFFFFF' : colors.ink }}>{l.native}</Text>
              </Pressable>
            );
          })}
        </View>
      </El>
      <El page={page} id="done">
        <Pressable onPress={() => { void chooseLanguage(picked); }} style={{ minHeight: 52, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>{w('done')}</Text>
        </Pressable>
      </El>
    </Screen>
  );
}