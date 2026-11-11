import * as Speech from 'expo-speech';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import type { Language } from '@/i18n/languages';
import { READ_OUT_RATE, useSettings } from '@/state/settings';

import { toParts, type ReadOutPart, type ReadOutScript } from './script';
import { installedVoiceLanguages, lacksVoice, speakSentence } from './speaker';

export type { ReadOutContent, ReadOutPart, ReadOutScript } from './script';

/**
 * Read It Out (docs/02 §7, S37): reads where you are → main content → what you
 * can do, one sentence at a time. While reading, a bar offers Pause · Repeat ·
 * Slower, and the part of the screen being read is highlighted.
 *
 * Reading sentence by sentence is what makes Pause work everywhere: Android's
 * speech engine can't pause mid-sentence, so Pause stops and Carry on restarts
 * the current sentence.
 */

export type ReadOutStatus = 'idle' | 'speaking' | 'paused';

/** How much "Slower" slows down each time. */
const SLOWER_STEP = 0.1;

interface ReadOutContextValue {
  status: ReadOutStatus;
  /** True while reading or paused (the bar is showing). */
  speaking: boolean;
  /** The <ReadOutTarget> being read, for highlighting. */
  activeTarget: string | null;
  /** True when this phone has no voice for the current language. */
  missingVoice: boolean;
  /**
   * Reads a script. `owner` (a screen's id) lets that screen stop only its own
   * reading when it closes, so the next screen's announcement or Buddy's answer
   * isn't cut off by the screen being left.
   */
  speak: (script: ReadOutScript, owner?: string) => void;
  /** Stops reading; with `owner`, only if that owner started it. */
  stop: (owner?: string) => void;
  toggle: (script: ReadOutScript, owner?: string) => void;
  pause: () => void;
  resume: () => void;
  repeat: () => void;
  slower: () => void;
  canGoSlower: boolean;
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
  const setRate = useSettings((s) => s.setReadOutRate);
  const [status, setStatus] = useState<ReadOutStatus>('idle');
  const [index, setIndex] = useState(0);
  const [parts, setParts] = useState<ReadOutPart[]>([]);
  const [installed, setInstalled] = useState<ReadonlySet<string>>(new Set());

  // The latest values for callbacks that outlive a render.
  const live = useRef({ parts, rate, language, installed });
  useLayoutEffect(() => {
    live.current = { parts, rate, language, installed };
  });
  const cancelCurrent = useRef<(() => void) | null>(null);
  const owner = useRef<string | null>(null);
  // Bumped on every new sentence or stop, so a late "done" from an old one is ignored.
  const generation = useRef(0);

  useEffect(() => {
    let mounted = true;
    void installedVoiceLanguages().then((set) => mounted && setInstalled(set));
    return () => {
      mounted = false;
    };
  }, []);

  const halt = useCallback(() => {
    generation.current += 1;
    cancelCurrent.current?.();
    cancelCurrent.current = null;
  }, []);

  const playFrom = useCallback(
    (start: number, list: ReadOutPart[] = live.current.parts, rateOverride?: number) => {
      halt();
      const run = (i: number) => {
        const part = list[i];
        if (!part) {
          setStatus('idle');
          setIndex(0);
          return;
        }
        const id = ++generation.current;
        setIndex(i);
        setStatus('speaking');
        const { installed: voices } = live.current;
        // Read from the store, so a speed chosen a moment ago applies straight away.
        const currentRate = useSettings.getState().readOut.rate;
        const lang = part.language ?? live.current.language;
        cancelCurrent.current = speakSentence(part.text, {
          language: lang,
          rate: rateOverride ?? currentRate,
          useCloudVoice: lacksVoice(voices, lang),
          onDone: () => {
            if (generation.current === id) run(i + 1);
          },
        });
      };
      run(start);
    },
    [halt],
  );

  const stop = useCallback(
    (by?: string) => {
      if (by !== undefined && owner.current !== by) return;
      owner.current = null;
      halt();
      // Also silences anything else speaking (a voice note never talks over a read-out).
      void Speech.stop();
      setStatus('idle');
      setIndex(0);
    },
    [halt],
  );

  const speak = useCallback(
    (script: ReadOutScript, by?: string) => {
      const list = toParts(script);
      if (list.length === 0) return;
      owner.current = by ?? null;
      setParts(list);
      playFrom(0, list);
    },
    [playFrom],
  );

  const toggle = useCallback(
    (script: ReadOutScript, by?: string) => (status === 'idle' ? speak(script, by) : stop()),
    [status, speak, stop],
  );

  const pause = useCallback(() => {
    halt();
    setStatus('paused');
  }, [halt]);

  const resume = useCallback(() => playFrom(index), [playFrom, index]);
  const repeat = useCallback(() => playFrom(index), [playFrom, index]);

  const slower = useCallback(() => {
    const next = Math.max(READ_OUT_RATE.min, Math.round((rate - SLOWER_STEP) * 100) / 100);
    setRate(next);
    // Say the current sentence again at the new speed.
    playFrom(index, live.current.parts, next);
  }, [rate, setRate, playFrom, index]);

  // Never keep talking after the app goes to the background or the language changes.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') stop();
    });
    return () => sub.remove();
  }, [stop]);

  useEffect(() => () => stop(), [language, stop]);

  const value = useMemo<ReadOutContextValue>(
    () => ({
      status,
      speaking: status !== 'idle',
      activeTarget: status === 'idle' ? null : (parts[index]?.target ?? null),
      missingVoice: lacksVoice(installed, language),
      speak,
      stop,
      toggle,
      pause,
      resume,
      repeat,
      slower,
      canGoSlower: rate > READ_OUT_RATE.min + 0.001,
    }),
    [
      status,
      parts,
      index,
      installed,
      language,
      speak,
      stop,
      toggle,
      pause,
      resume,
      repeat,
      slower,
      rate,
    ],
  );
  return <ReadOutContext.Provider value={value}>{children}</ReadOutContext.Provider>;
}

export function useReadOut(): ReadOutContextValue {
  const value = useContext(ReadOutContext);
  if (!value) throw new Error('useReadOut must be used inside <ReadOutProvider>');
  return value;
}
