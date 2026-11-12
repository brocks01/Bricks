import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BigButton, Screen, Text } from '@/components';
import { useResumeHere } from '@/features/onboarding/useResumeHere';
import { TextSizePicker } from '@/features/settings/TextSizePicker';
import { useSettings } from '@/state/settings';

/**
 * S1b Text size: right after the language, so every later step is already in a
 * size they can read. Choosing changes the app at once (they see it before going
 * on); Normal is chosen to start with. Changeable later in Settings.
 */
export default function TextSizeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const textSize = useSettings((s) => s.textSize);
  const setTextSize = useSettings((s) => s.setTextSize);
  useResumeHere('/onboarding/text-size');

  return (
    <Screen
      title={t('textSize.title')}
      readOut={() => t('textSize.readout', { size: t(`textSize.${textSize}`) })}
      testID="screen-onboarding-text-size"
      footer={
        <BigButton
          label={t('common.next')}
          onPress={() => router.push('/onboarding/who')}
          testID="text-size-next"
        />
      }
    >
      <Text color="textSecondary">{t('textSize.subtitle')}</Text>
      <TextSizePicker selected={textSize} onChoose={setTextSize} />
    </Screen>
  );
}
