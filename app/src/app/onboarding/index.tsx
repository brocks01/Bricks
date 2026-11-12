import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, StyleSheet, View } from 'react-native';

import { Screen, Text } from '@/components';
import { WelcomeCollage } from '@/features/onboarding/WelcomeCollage';
import { useResumeHere } from '@/features/onboarding/useResumeHere';
import { LanguagePicker } from '@/features/settings/LanguagePicker';
import { LANGUAGE_INFO, LANGUAGES } from '@/i18n/languages';
import { useSettings } from '@/state/settings';
import { space } from '@/theme';
import { useCompact } from '@/theme/TypographyProvider';

/**
 * S1 Language (Singpass / LifeSG): the app name, "Choose your language" in all
 * four languages, and four big buttons in their own scripts. Choosing one
 * switches the whole app and moves on to the text size. Read it out says it in all four voices.
 */
export default function LanguageScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const chosen = useSettings((s) => s.language);
  const setLanguage = useSettings((s) => s.setLanguage);
  const compact = useCompact();
  useResumeHere('/onboarding');

  // The very first screen: Android Back leaves the app instead of skipping set-up.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        BackHandler.exitApp();
        return true;
      });
      return () => sub.remove();
    }, []),
  );

  return (
    <Screen
      readOut={LANGUAGES.map((language) => ({
        text: LANGUAGE_INFO[language].chooseLanguageReadOut,
        language,
      }))}
      back={false}
      testID="screen-onboarding-language"
    >
      <WelcomeCollage />
      <Text variant="display" style={compact ? null : styles.appName}>
        {t('common.appName')}
      </Text>
      <View style={styles.prompts}>
        {LANGUAGES.map((language) => (
          <Text key={language} variant="bodyStrong" lang={language}>
            {LANGUAGE_INFO[language].chooseLanguage}
          </Text>
        ))}
      </View>
      <LanguagePicker
        selected={chosen}
        onChoose={(language) => {
          setLanguage(language);
          router.push('/onboarding/text-size');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  appName: {
    marginTop: space.md,
  },
  prompts: {
    gap: space.xxs,
    marginBottom: space.sm,
  },
});
