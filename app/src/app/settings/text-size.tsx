import { useTranslation } from 'react-i18next';

import { Screen, Text } from '@/components';
import { TextSizePicker } from '@/features/settings/TextSizePicker';
import { useSettings } from '@/state/settings';

/**
 * Settings → Text size: the same three cards as onboarding. The app changes at once,
 * and the screen stays open so they can compare before going back.
 */
export default function TextSizeSettingsScreen() {
  const { t } = useTranslation();
  const textSize = useSettings((s) => s.textSize);
  const setTextSize = useSettings((s) => s.setTextSize);

  return (
    <Screen
      section="settings"
      title={t('textSize.title')}
      readOut={() => t('textSize.readout', { size: t(`textSize.${textSize}`) })}
      testID="screen-settings-text-size"
    >
      <Text color="textSecondary">{t('textSize.settingsSubtitle')}</Text>
      <TextSizePicker selected={textSize} onChoose={setTextSize} />
    </Screen>
  );
}
