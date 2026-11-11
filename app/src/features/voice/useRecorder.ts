import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';

import { useReadOut } from '@/features/readout/ReadOutProvider';

/**
 * Records one voice clip: a thank-you, a voice intro, or what someone says to
 * Buddy. Tap to start and tap to stop (never hold to talk). Stops by itself at
 * the time limit and, when asked, after a pause in speaking.
 */

export type RecorderState = 'idle' | 'starting' | 'recording' | 'recorded' | 'denied' | 'failed';

export interface Recording {
  uri: string;
  durationS: number;
}

export interface RecorderOptions {
  maxSeconds: number;
  /** Stop after this much quiet once they've started speaking (Buddy: 1.5 s). */
  stopAfterSilenceMs?: number;
  onRecorded?: (recording: Recording) => void;
}

/** Below this level (dBFS) counts as quiet; above it as speaking. */
const QUIET_DB = -45;
/** How often to check the time limit and the sound level while recording. */
const CHECK_EVERY_MS = 200;

export function useRecorder({ maxSeconds, stopAfterSilenceMs, onRecorded }: RecorderOptions) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const { stop: stopReadOut } = useReadOut();
  const [state, setState] = useState<RecorderState>('idle');
  const [recording, setRecording] = useState<Recording | null>(null);
  const [elapsedS, setElapsedS] = useState(0);
  const silence = useRef({ heardSpeech: false, quietSince: 0 });

  const start = useCallback(async () => {
    try {
      // (State changes only after the first await, so this is safe to call when a sheet opens.)
      const permission = await requestRecordingPermissionsAsync();
      setRecording(null);
      setElapsedS(0);
      setState('starting');
      if (!permission.granted) {
        setState('denied');
        return;
      }
      stopReadOut();
      // iOS only records while the audio session allows it.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      silence.current = { heardSpeech: false, quietSince: 0 };
      recorder.record();
      setState('recording');
    } catch (error) {
      if (__DEV__) console.warn('[recorder] could not start', error);
      setState('failed');
    }
  }, [recorder, stopReadOut]);

  const stop = useCallback(async (): Promise<Recording | null> => {
    if (state !== 'recording') return null;
    const durationS = Math.max(1, Math.round((recorder.getStatus().durationMillis ?? 0) / 1000));
    try {
      await recorder.stop();
    } finally {
      // Back to playback through the loudspeaker (recording mode uses the earpiece on iPhone).
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    }
    const uri = recorder.uri;
    if (!uri) {
      setState('failed');
      return null;
    }
    const result = { uri, durationS };
    setRecording(result);
    setState('recorded');
    onRecorded?.(result);
    return result;
  }, [state, recorder, onRecorded]);

  /** Stops without keeping anything (closing a sheet, leaving a screen). */
  const cancel = useCallback(async () => {
    if (recorder.isRecording) {
      await recorder.stop().catch(() => {});
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    }
    setRecording(null);
    setState('idle');
  }, [recorder]);

  const reset = useCallback(() => {
    setRecording(null);
    setState('idle');
  }, []);

  // While recording: show the time, and stop at the limit or after a pause in speaking.
  const check = useEffectEvent(() => {
    const { durationMillis = 0, metering } = recorder.getStatus();
    setElapsedS(Math.floor(durationMillis / 1000));
    if (durationMillis >= maxSeconds * 1000) {
      void stop();
      return;
    }
    if (!stopAfterSilenceMs || metering === undefined) return;
    const now = Date.now();
    if (metering > QUIET_DB) {
      silence.current = { heardSpeech: true, quietSince: 0 };
    } else if (silence.current.heardSpeech) {
      if (!silence.current.quietSince) silence.current.quietSince = now;
      else if (now - silence.current.quietSince >= stopAfterSilenceMs) void stop();
    }
  });
  useEffect(() => {
    if (state !== 'recording') return;
    const timer = setInterval(() => check(), CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, [state]);

  // Never leave the microphone on after the screen goes away.
  useEffect(
    () => () => {
      if (recorder.isRecording) void recorder.stop().catch(() => {});
    },
    [recorder],
  );

  return { state, recording, elapsedS, maxSeconds, start, stop, cancel, reset };
}
