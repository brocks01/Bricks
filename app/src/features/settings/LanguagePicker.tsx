import { StyleSheet, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { CheckCircleIcon } from '@/components/primitives/icons';
import { LANGUAGE_INFO, LANGUAGES, type Language } from '@/i18n/languages';
import { space } from '@/theme';

/**
 * The four languages as big buttons, each written in its own script
 * (docs/02 §8): English · Bahasa Melayu · 中文 · தமிழ். No flags, no dropdown.
 */
export function LanguagePicker({
  selected,
  onChoose,
}: {
  selected: Language | null;
  onChoose: (language: Language) => void;
}) {
  return (
    <View style={styles.list}>
      {LANGUAGES.map((language) => (
        <BigButton
          key={language}
          size="lg"
          variant={selected === language ? 'primary' : 'outline'}
          icon={selected === language ? CheckCircleIcon : undefined}
          label={LANGUAGE_INFO[language].nativeName}
          labelLanguage={language}
          accessibilityState={{ selected: selected === language }}
          onPress={() => onChoose(language)}
          testID={`language-${language}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
});
