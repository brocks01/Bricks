import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BigButton, Card, RecordPanel, Screen, Text } from '@/components';
import { useResumeHere } from '@/features/onboarding/useResumeHere';
import { useOnboarding } from '@/state/onboarding';

/** A voice intro is short: 10 seconds (docs/02b S5). */
const INTRO_SECONDS = 10;

/**
 * S5 Voice intro (Hinge voice prompts): "Tell people a little about you".
 * Tap to record up to 10 seconds, listen back, record again, or skip.
 * It becomes the voice on their Pass It On profile.
 */
export default function VoiceIntroScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const intro = useOnboarding((s) => s.draft.intro);
  const updateDraft = useOnboarding((s) => s.updateDraft);
  useResumeHere('/onboarding/voice-intro');

  return (
    <Screen
      title={t('onboarding.voiceIntro.title')}
      readOut={() => t('onboarding.voiceIntro.readout', { seconds: INTRO_SECONDS })}
      tellMe={false}
      testID="screen-onboarding-voice-intro"
      footer={
        <BigButton
          label={intro ? t('common.next') : t('onboarding.skipForNow')}
          variant={intro ? 'primary' : 'outline'}
          onPress={() => router.push('/onboarding/safe-circle')}
          testID="voice-intro-next"
        />
      }
    >
      <Card tone="subtle">
        <Text variant="heading">{t('onboarding.voiceIntro.prompt')}</Text>
        <Text color="textSecondary">{t('onboarding.voiceIntro.examples')}</Text>
      </Card>
      <RecordPanel
        maxSeconds={INTRO_SECONDS}
        onChange={(recording) =>
          updateDraft({
            intro: recording ? { uri: recording.uri, durationS: recording.durationS } : null,
          })
        }
        testID="intro"
      />
    </Screen>
  );
}
