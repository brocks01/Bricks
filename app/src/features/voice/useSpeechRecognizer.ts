import { requireOptionalNativeModule } from 'expo';
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionModule,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';
import { useEffect, useEffectEvent, useRef, useState } from 'react';

import type { Language } from '@/i18n/languages';

/**
 * The phone's own speech recogniser (Android's SpeechRecognizer, iOS Speech) via
 * expo-speech-recognition. Loaded optionally: it isn't in Expo Go (iPhone), where
 * importing the package would throw, so we only import its types.
 */
const speechModule =
  requireOptionalNativeModule<typeof ExpoSpeechRecognitionModule>('ExpoSpeechRecognition');

/** True in our own builds, where the phone can turn speech into words. */
export const canRecognizeSpeech = speechModule != null;

/** The recogniser's locale for each app language (Singapore first where it exists). */
export const SPEECH_LOCALE: Record<Language, string> = {
  en: 'en-SG',
  ms: 'ms-MY',
  zh: 'cmn-Hans-CN',
  ta: 'ta-IN',
};

export type RecognizerState = 'idle' | 'listening' | 'notHeard' | 'denied';

/**
 * One utterance at a time: start() listens, words arrive as they're heard
 * (`transcript`), and `onFinal` gets the whole sentence once they stop talking.
 * Stops by itself after a pause; stop() ends early and keeps what was heard.
 */
export function useSpeechRecognizer({
  language,
  onFinal,
}: {
  language: Language;
  onFinal: (text: string) => void;
}) {
  const [state, setState] = useState<RecognizerState>('idle');
  const [transcript, setTranscript] = useState('');
  const heard = useRef('');
  const done = useRef(false);

  const finish = useEffectEvent((text: string) => {
    if (done.current) return;
    done.current = true;
    if (text) {
      setState('idle');
      onFinal(text);
    } else {
      setState('notHeard');
    }
  });

  useEffect(() => {
    if (!speechModule) return;
    const subs = [
      speechModule.addListener('result', (e: ExpoSpeechRecognitionResultEvent) => {
        const text = e.results[0]?.transcript?.trim() ?? '';
        if (text) {
          heard.current = text;
          setTranscript(text);
        }
        if (e.isFinal) finish(heard.current);
      }),
      speechModule.addListener('error', (e: ExpoSpeechRecognitionErrorEvent) => {
        if (e.error === 'aborted') return;
        if (e.error === 'not-allowed') {
          done.current = true;
          setState('denied');
          return;
        }
        // "no-speech" / "nomatch" / network: keep anything already heard.
        finish(heard.current);
      }),
      // Always the last event: if no final result came, use what we have.
      speechModule.addListener('end', () => finish(heard.current)),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      speechModule.abort();
    };
  }, []);

  const start = async () => {
    if (!speechModule) return;
    heard.current = '';
    done.current = false;
    setTranscript('');
    const permission = await speechModule.requestPermissionsAsync();
    if (!permission.granted) {
      done.current = true;
      setState('denied');
      return;
    }
    setState('listening');
    speechModule.start({
      lang: SPEECH_LOCALE[language],
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
    });
  };

  return {
    state,
    transcript,
    start,
    /** End now and use what was heard so far. */
    stop: () => speechModule?.stop(),
    /** Throw it away (Close). */
    cancel: () => {
      done.current = true;
      speechModule?.abort();
    },
  };
}
