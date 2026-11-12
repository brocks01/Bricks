import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useCheerWalk } from '@/api';
import type { PersonSummary } from '@/api/types';
import {
  BigButton,
  BottomSheet,
  ButtonRow,
  HandsClappingIcon,
  MicrophoneIcon,
  PaperPlaneTiltIcon,
  RecordPanel,
  SheetHeader,
  StatusBanner,
  showToast,
} from '@/components';
import type { Recording } from '@/features/voice/useRecorder';
import { space } from '@/theme';

/** A voice cheer is short (docs/02b S19). */
export const VOICE_CHEER_SECONDS = 10;

const firstName = (p: PersonSummary) => p.name.split(' ')[0] ?? p.name;

/**
 * Cheer and Voice cheer for someone's shared walk (Strava kudos, kinder): one tap,
 * or a voice note up to 10 seconds. Used on the Circle feed (S19) and the walk (S23).
 */
export function CheerButtons({
  walkId,
  owner,
  cheered,
  testID,
}: {
  walkId: string;
  owner: PersonSummary;
  cheered: boolean;
  testID: string;
}) {
  const { t } = useTranslation();
  const cheer = useCheerWalk();
  const [recording, setRecording] = useState(false);
  const name = firstName(owner);

  return (
    <>
      <ButtonRow>
        <BigButton
          variant={cheered ? 'success' : 'primary'}
          icon={HandsClappingIcon}
          label={cheered ? t('walkFeed.cheered') : t('walkFeed.cheer')}
          accessibilityLabel={
            cheered ? t('walkFeed.cheeredName', { name }) : t('walkFeed.cheerName', { name })
          }
          disabled={cheered || cheer.isPending}
          onPress={() =>
            cheer.mutate(
              { walk_id: walkId, kind: 'thumb', audio_uri: null, duration_s: null },
              { onSuccess: () => showToast(t('walkFeed.cheerSent', { name })) },
            )
          }
          testID={`${testID}-cheer`}
        />
        <BigButton
          variant="outline"
          icon={MicrophoneIcon}
          label={t('walkFeed.voiceCheer')}
          onPress={() => setRecording(true)}
          testID={`${testID}-voice`}
        />
      </ButtonRow>
      <VoiceCheerSheet
        visible={recording}
        walkId={walkId}
        name={name}
        onClose={() => setRecording(false)}
        testID={`${testID}-sheet`}
      />
    </>
  );
}

function VoiceCheerSheet({
  visible,
  walkId,
  name,
  onClose,
  testID,
}: {
  visible: boolean;
  walkId: string;
  name: string;
  onClose: () => void;
  testID: string;
}) {
  const { t } = useTranslation();
  const cheer = useCheerWalk();
  const [clip, setClip] = useState<Recording | null>(null);

  const close = () => {
    setClip(null);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onRequestClose={close} testID={testID}>
      <SheetHeader
        icon={MicrophoneIcon}
        title={t('walkFeed.voiceTitle', { name })}
        text={t('walkFeed.voiceHint')}
      />
      <View style={styles.body}>
        <RecordPanel maxSeconds={VOICE_CHEER_SECONDS} onChange={setClip} testID="cheer" />
        <BigButton
          icon={PaperPlaneTiltIcon}
          label={t('walkFeed.send')}
          disabled={!clip || cheer.isPending}
          onPress={() =>
            clip &&
            cheer.mutate(
              { walk_id: walkId, kind: 'voice', audio_uri: clip.uri, duration_s: clip.durationS },
              {
                onSuccess: () => {
                  close();
                  showToast(t('walkFeed.voiceSent', { name }));
                },
              },
            )
          }
          testID="cheer-send"
        />
        {cheer.isError ? <StatusBanner tone="notice" text={t('common.error')} /> : null}
        <BigButton
          variant="outline"
          label={t('walkFeed.cancel')}
          onPress={close}
          testID="cheer-cancel"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space.sm,
  },
});
