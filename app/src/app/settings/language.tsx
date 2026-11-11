import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useUpdateMe } from '@/api';
import { Screen } from '@/components';
import { LanguagePicker } from '@/features/settings/LanguagePicker';
import { LANGUAGE_INFO, type Language } from '@/i18n/languages';
import { useActiveLanguage } from '@/i18n/useActiveLanguage';
import { useSettings } from '@/state/settings';
import { useUndo } from '@/state/undo';

/** Settings → Language: the same four buttons as S1. The whole app switches at once, with Undo. */
export default function LanguageSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const current = useActiveLanguage();
  const setLanguage = useSettings((s) => s.setLanguage);
  const updateMe = useUpdateMe();
  const showUndo = useUndo((s) => s.show);

  const choose = (language: Language) => {
    if (language !== current) {
      const before = current;
      setLanguage(language);
      updateMe.mutate({ language });
      showUndo(
        t('settings.languageChanged', { language: LANGUAGE_INFO[language].nativeName }),
        () => {
          setLanguage(before);
          updateMe.mutate({ language: before });
        },
      );
    }
    if (router.canGoBack()) router.back();
  };

  return (
    <Screen
      title={t('settings.language')}
      readOut={() => t('settings.languageReadout')}
      testID="screen-settings-language"
    >
      <LanguagePicker selected={current} onChoose={choose} />
    </Screen>
  );
}
