import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSaveIntro } from '@/api';
import { BigButton, Card, RecordPanel, Screen, StatusBanner, Text } from '@/components';
import type { Recording } from '@/features/voice/useRecorder';

const INTRO_SECONDS = 10;

/** Record or replace the voice intro on their profile (S5, from Pass It On): listen back, then Save. */
export default function RecordIntroScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const save = useSaveIntro();
  const [recording, setRecording] = useState<Recording | null>(null);

  const onSave = async () => {
    if (!recording) return;
    try {
      await save.mutateAsync({ audio_uri: recording.uri, duration_s: recording.durationS });
      // They listened to it before saving; Pass It On now plays the new one.
      if (router.canGoBack()) router.back();
    } catch {
      // Banner below.
    }
  };

  return (
    <Screen
      section="activity"
      title={t('onboarding.voiceIntro.title')}
      readOut={() => t('onboarding.voiceIntro.readout', { seconds: INTRO_SECONDS })}
      testID="screen-record-intro"
      footer={
        <BigButton
          label={t('common.save')}
          disabled={!recording || save.isPending}
          onPress={() => void onSave()}
          testID="intro-save"
        />
      }
    >
      <Card tone="subtle">
        <Text variant="heading">{t('onboarding.voiceIntro.prompt')}</Text>
        <Text color="textSecondary">{t('onboarding.voiceIntro.examples')}</Text>
      </Card>
      <RecordPanel maxSeconds={INTRO_SECONDS} onChange={setRecording} testID="intro" />
      {save.isError ? <StatusBanner tone="notice" text={t('common.error')} /> : null}
    </Screen>
  );
}
