import { StyleSheet, View } from 'react-native';

import { BigButton } from '@/components/BigButton';
import { CheckCircleIcon } from '@/components/primitives/icons';
import { LANGUAGE_INFO, LANGUAGES, type Language } from '@/i18n/languages';
import { space } from '@/theme';
import { useCompact, useEffectiveFontScale } from '@/theme/TypographyProvider';

/** Above this text scale the grid cells get too narrow for "Bahasa Melayu". */
const GRID_MAX_SCALE = 1.2;

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
  const compact = useCompact();
  const scale = useEffectiveFontScale();
  const grid = compact && scale <= GRID_MAX_SCALE;
  return (
    <View style={[styles.list, grid && styles.grid]}>
      {LANGUAGES.map((language) => (
        <View key={language} style={grid ? styles.cell : null}>
          <BigButton
            size="lg"
            variant={selected === language ? 'primary' : 'outline'}
            icon={selected === language ? CheckCircleIcon : undefined}
            label={LANGUAGE_INFO[language].nativeName}
            labelLanguage={language}
            accessibilityState={{ selected: selected === language }}
            onPress={() => onChoose(language)}
            testID={`language-${language}`}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs + space.xxs,
  },
  cell: {
    flexBasis: '45%',
    flexGrow: 1,
  },
});
