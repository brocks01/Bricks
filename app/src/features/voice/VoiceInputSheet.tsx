import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { Chip } from '@/components/Chip';
import { ListeningSheet, type ListeningMode } from '@/components/ListeningSheet';
import { Text } from '@/components/primitives/Text';
import { useActiveLanguage } from '@/i18n/useActiveLanguage';
import { config } from '@/lib/config';
import { borderWidth, color, radius, space } from '@/theme';

import { useRecorder } from './useRecorder';

export interface VoiceInputSheetProps {
  visible: boolean;
  /** The words they said. */
  onResult: (text: string) => void;
  onClose: () => void;
  /** Phrases a facilitator can tap on mock data, where there's no speech-to-text. */
  demoPhrases?: readonly string[];
  /** Longest a recording can be. */
  maxSeconds?: number;
}

/** Stop listening after this much quiet (docs/04 1.3 §5.2). */
const SILENCE_MS = 1500;

/**
 * Listens once: records as soon as it opens, stops on Stop or after a pause,
 * and turns the recording into words with the backend's speech service.
 *
 * Expo Go has no speech-to-text, so on mock data a clearly labelled
 * "Demo: tap what was said" list stands in for it. It's for facilitated tests
 * and filming only: we test the flow, not the recognition (1.3 §9).
 */
export function VoiceInputSheet(props: VoiceInputSheetProps) {
  // A fresh listening session each time it opens.
  return props.visible ? <ListeningSession {...props} /> : null;
}

function ListeningSession({
  onResult,
  onClose,
  demoPhrases,
  maxSeconds = 15,
}: VoiceInputSheetProps) {
  const { t } = useTranslation();
  const language = useActiveLanguage();
  const [mode, setMode] = useState<ListeningMode>('listening');

  const transcribe = async (uri: string) => {
    setMode('thinking');
    try {
      const { text } = await api.transcribe({ audio_uri: uri, language });
      if (text.trim()) onResult(text.trim());
      else setMode('notHeard');
    } catch {
      setMode('notHeard');
    }
  };

  const rec = useRecorder({
    maxSeconds,
    stopAfterSilenceMs: SILENCE_MS,
    onRecorded: ({ uri }) => void transcribe(uri),
  });

  // Start listening as soon as it opens: tapping Tell me is the "start".
  const begin = useEffectEvent(() => void rec.start());
  useEffect(() => begin(), []);

  const shownMode: ListeningMode = rec.state === 'denied' ? 'denied' : mode;
  const showDemo = config.demoVoice && demoPhrases && demoPhrases.length > 0;

  return (
    <ListeningSheet
      visible
      transcript=""
      mode={shownMode}
      onStop={() => void rec.stop()}
      onRetry={() => {
        setMode('listening');
        void rec.start();
      }}
      onClose={() => {
        void rec.cancel();
        onClose();
      }}
    >
      {showDemo ? (
        <View style={styles.demo} testID="voice-demo">
          <Text variant="bodyStrong">{t('listening.demoTitle')}</Text>
          <ScrollView style={styles.demoList} contentContainerStyle={styles.demoContent}>
            {demoPhrases.map((phrase, i) => (
              <Chip
                key={phrase}
                label={phrase}
                selected={false}
                onPress={() => {
                  void rec.cancel();
                  onResult(phrase);
                }}
                testID={`voice-demo-${i}`}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </ListeningSheet>
  );
}

const styles = StyleSheet.create({
  demo: {
    gap: space.xs,
    padding: space.sm,
    borderRadius: radius.card,
    borderWidth: borderWidth.control,
    borderStyle: 'dashed',
    borderColor: color.borderStrong,
  },
  demoList: {
    maxHeight: 260,
  },
  demoContent: {
    gap: space.xs,
  },
});
