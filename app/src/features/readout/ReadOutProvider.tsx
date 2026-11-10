import * as Speech from 'expo-speech';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { LANGUAGE_INFO, type Language } from '@/i18n/languages';
import { useSettings } from '@/state/settings';

/**
 * Read It Out (docs/02 §7): reads where you are → main content → what you can do.
 *
 * Iteration 0.1 ships the core engine (speak / stop in the member's language at a
 * slow rate). Iteration 1.3 adds highlighting, Pause · Repeat · Slower, per-card
 * reading and the /tts fallback when a device has no Malay or Tamil voice.
 */

/** A screen's script. A function so it is built fresh (current data) at tap time. */
export type ReadOutScript = string | (() => string);

interface ReadOutContextValue {
  speaking: boolean;
  speak: (script: ReadOutScript) => void;
  stop: () => void;
  toggle: (script: ReadOutScript) => void;
}

const ReadOutContext = createContext<ReadOutContextValue | null>(null);

export function ReadOutProvider({
  language,
  children,
}: {
  language: Language;
  children: ReactNode;
}) {
  const rate = useSettings((s) => s.readOut.rate);
  const [speaking, setSpeaking] = useState(false);
  // Each utterance gets an id so a late callback from an old one can't flip state.
  const utteranceId = useRef(0);

  const stop = useCallback(() => {
    utteranceId.current += 1;
    setSpeaking(false);
    void Speech.stop();
  }, []);

  const speak = useCallback(
    (script: ReadOutScript) => {
      const text = (typeof script === 'function' ? script() : script).trim();
      if (!text) return;
      void Speech.stop();
      const id = ++utteranceId.current;
      const finish = () => {
        if (utteranceId.current === id) setSpeaking(false);
      };
      setSpeaking(true);
      Speech.speak(text, {
        language: LANGUAGE_INFO[language].speechLocale,
        rate,
        onDone: finish,
        onStopped: finish,
        onError: (error) => {
          if (__DEV__) console.warn('[readout] speech failed', error);
          finish();
        },
      });
    },
    [language, rate],
  );

  const toggle = useCallback(
    (script: ReadOutScript) => (speaking ? stop() : speak(script)),
    [speaking, speak, stop],
  );

  // Never keep talking after the app goes to the background or the language changes.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status) => {
      if (status !== 'active') stop();
    });
    return () => sub.remove();
  }, [stop]);

  useEffect(() => stop, [language, stop]);

  const value = useMemo(() => ({ speaking, speak, stop, toggle }), [speaking, speak, stop, toggle]);
  return <ReadOutContext.Provider value={value}>{children}</ReadOutContext.Provider>;
}

export function useReadOut(): ReadOutContextValue {
  const value = useContext(ReadOutContext);
  if (!value) throw new Error('useReadOut must be used inside <ReadOutProvider>');
  return value;
}
