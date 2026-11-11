import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useRecorder, type Recording } from '@/features/voice/useRecorder';
import { formatDuration } from '@/lib/format';
import { space } from '@/theme';

import { BigButton } from './BigButton';
import { ArrowCounterClockwiseIcon, MicrophoneIcon, StopIcon } from './primitives/icons';
import { Text } from './primitives/Text';
import { StatusBanner } from './StatusBanner';
import { VoicePlayer } from './VoicePlayer';

export interface RecordPanelProps {
  /** 10 s for a voice intro, 20 s for a thank-you. */
  maxSeconds: number;
  /** Called with the new clip, or null when they choose to record again. */
  onChange: (recording: Recording | null) => void;
  testID?: string;
}

/**
 * Record a short voice clip (Hinge voice prompts, WhatsApp voice notes):
 * tap Record, tap Stop, listen back, record again if they like. Shows the time
 * used out of the limit, and says plainly when the microphone isn't allowed.
 */
export function RecordPanel({ maxSeconds, onChange, testID = 'record' }: RecordPanelProps) {
  const { t } = useTranslation();
  const rec = useRecorder({ maxSeconds, onRecorded: onChange });

  if (rec.state === 'recorded' && rec.recording) {
    return (
      <View style={styles.panel} testID={`${testID}-done`}>
        <VoicePlayer
          audioUrl={rec.recording.uri}
          durationS={rec.recording.durationS}
          testID={`${testID}-preview`}
        />
        <BigButton
          variant="outline"
          icon={ArrowCounterClockwiseIcon}
          label={t('prompt.recordAgain')}
          onPress={() => {
            rec.reset();
            onChange(null);
          }}
          testID={`${testID}-again`}
        />
      </View>
    );
  }

  if (rec.state === 'recording') {
    return (
      <View style={styles.panel}>
        <Text variant="heading" accessibilityLiveRegion="polite" testID={`${testID}-timer`}>
          {t('record.recording', {
            time: formatDuration(rec.elapsedS),
            max: formatDuration(maxSeconds),
          })}
        </Text>
        <BigButton
          size="lg"
          icon={StopIcon}
          label={t('common.stop')}
          onPress={() => void rec.stop()}
          testID={`${testID}-stop`}
        />
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      {rec.state === 'denied' ? (
        <StatusBanner tone="notice" text={t('record.denied')} testID={`${testID}-denied`} />
      ) : null}
      {rec.state === 'failed' ? <StatusBanner tone="notice" text={t('common.error')} /> : null}
      <BigButton
        size="lg"
        icon={MicrophoneIcon}
        label={t('record.start')}
        disabled={rec.state === 'starting'}
        onPress={() => void rec.start()}
        testID={`${testID}-start`}
      />
      <Text color="textSecondary">{t('record.hint', { seconds: maxSeconds })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: space.sm,
  },
});
