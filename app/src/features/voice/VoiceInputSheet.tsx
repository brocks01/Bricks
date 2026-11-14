import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { Chip } from '@/components/Chip';
import { ListeningSheet, type ListeningMode } from '@/components/ListeningSheet';
import { Text } from '@/components/primitives/Text';
import { useActiveLanguage } from '@/i18n/useActiveLanguage';
import { config } from '@/lib/config';
import { borderWidth, color, layout, radius, space } from '@/theme';

import { useRecorder } from './useRecorder';
import { canRecognizeSpeech, useSpeechRecognizer } from './useSpeechRecognizer';

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
 * Listens once, as soon as it opens; stops on Stop or after a pause.
 *
 * - Our own builds: the phone's speech recogniser, with the words shown as they
 *   are heard. Works without the backend.
 * - Expo Go (iPhone): records, then the backend's speech service turns it into
 *   words. On mock data there's no speech service, so a clearly labelled
 *   "Demo: tap what was said" list stands in for it (facilitated tests, 1.3 §9).
 */
export function VoiceInputSheet(props: VoiceInputSheetProps) {
  // A fresh listening session each time it opens.
  if (!props.visible) return null;
  return canRecognizeSpeech ? <PhoneSession {...props} /> : <RecordingSession {...props} />;
}

function PhoneSession({ onResult, onClose, demoPhrases }: VoiceInputSheetProps) {
  const language = useActiveLanguage();
  const speech = useSpeechRecognizer({ language, onFinal: onResult });

  const begin = useEffectEvent(() => void speech.start());
  useEffect(() => begin(), []);

  const mode: ListeningMode =
    speech.state === 'denied' ? 'denied' : speech.state === 'notHeard' ? 'notHeard' : 'listening';
  // The demo list is only a fallback here, after the phone didn't catch it.
  const showDemo = config.demoVoice && mode === 'notHeard' && demoPhrases && demoPhrases.length > 0;

  return (
    <ListeningSheet
      visible
      transcript={speech.transcript}
      mode={mode}
      onStop={speech.stop}
      onRetry={() => void speech.start()}
      onClose={() => {
        speech.cancel();
        onClose();
      }}
    >
      {showDemo ? <DemoPhrases phrases={demoPhrases} onPick={onResult} /> : null}
    </ListeningSheet>
  );
}

function DemoPhrases({
  phrases,
  onPick,
}: {
  phrases: readonly string[];
  onPick: (phrase: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.demo} testID="voice-demo">
      <Text variant="bodyStrong">{t('listening.demoTitle')}</Text>
      <ScrollView style={styles.demoList} contentContainerStyle={styles.demoContent}>
        {phrases.map((phrase, i) => (
          <Chip
            key={phrase}
            label={phrase}
            selected={false}
            onPress={() => onPick(phrase)}
            testID={`voice-demo-${i}`}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function RecordingSession({
  onResult,
  onClose,
  demoPhrases,
  maxSeconds = 15,
}: VoiceInputSheetProps) {
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
        <DemoPhrases
          phrases={demoPhrases}
          onPick={(phrase) => {
            void rec.cancel();
            onResult(phrase);
          }}
        />
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
    maxHeight: layout.sheetListMax,
  },
  demoContent: {
    gap: space.xs,
  },
});
