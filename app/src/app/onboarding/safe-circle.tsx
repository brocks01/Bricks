import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BigButton, Screen, Text } from '@/components';
import { useResumeHere } from '@/features/onboarding/useResumeHere';
import { SafeCircleEditor } from '@/features/safety/SafeCircleEditor';
import { useOnboarding } from '@/state/onboarding';

/**
 * S6 Safe Circle set-up (LifeSG tone + Be My Eyes clarity): one plain sentence
 * on why, then choose up to five people. Done, or Later (it can be set in
 * Settings at any time).
 */
export default function SafeCircleSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const members = useOnboarding((s) => s.draft.safeCircle);
  const updateDraft = useOnboarding((s) => s.updateDraft);
  useResumeHere('/onboarding/safe-circle');
  const next = () => router.push('/onboarding/reminders');

  return (
    <Screen
      title={t('onboarding.safeCircle.title')}
      readOut={() => t('onboarding.safeCircle.readout')}
      tellMe={false}
      testID="screen-onboarding-safe-circle"
      footer={
        members.length > 0 ? (
          <BigButton label={t('common.done')} onPress={next} testID="safe-circle-done" />
        ) : (
          <BigButton
            variant="outline"
            label={t('onboarding.later')}
            onPress={next}
            testID="safe-circle-later"
          />
        )
      }
    >
      <Text>{t('onboarding.safeCircle.why')}</Text>
      <SafeCircleEditor members={members} onChange={(safeCircle) => updateDraft({ safeCircle })} />
    </Screen>
  );
}
