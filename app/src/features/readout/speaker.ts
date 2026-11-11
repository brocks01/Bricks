import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';

import { api } from '@/api/client';
import { LANGUAGE_INFO, type Language } from '@/i18n/languages';
import { READ_OUT_RATE } from '@/state/settings';

/**
 * Says one sentence, on the phone's own voice or, when the phone has no voice
 * for the language (often Malay or Tamil on Android), with audio from the
 * backend's /tts. Returns a function that stops it.
 */

export interface SpeakOptions {
  language: Language;
  rate: number;
  /** True when the phone has no voice for this language. */
  useCloudVoice: boolean;
  onDone: () => void;
}

/** Voices installed on this phone, by language code ("ms", "ta"). Empty if unknown. */
export async function installedVoiceLanguages(): Promise<Set<string>> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    return new Set(voices.map((v) => v.language.toLowerCase().split(/[-_]/)[0]!));
  } catch {
    return new Set();
  }
}

/**
 * Whether the phone can't read this language aloud. An empty list means the
 * phone didn't say (some Android engines list voices late), so we assume it can.
 */
export function lacksVoice(installed: ReadonlySet<string>, language: Language): boolean {
  return installed.size > 0 && !installed.has(language);
}

function speakOnDevice(text: string, { language, rate, onDone }: SpeakOptions): () => void {
  let active = true;
  const finish = () => {
    if (!active) return;
    active = false;
    onDone();
  };
  Speech.speak(text, {
    language: LANGUAGE_INFO[language].speechLocale,
    rate,
    onDone: finish,
    onError: (error) => {
      if (__DEV__) console.warn('[readout] speech failed', error);
      finish();
    },
  });
  return () => {
    active = false;
    void Speech.stop();
  };
}

export function speakSentence(text: string, options: SpeakOptions): () => void {
  if (!options.useCloudVoice) return speakOnDevice(text, options);

  let cancelled = false;
  let player: AudioPlayer | null = null;
  let stopDevice: (() => void) | null = null;

  api
    .tts({ text, language: options.language })
    .then(({ audio_url }) => {
      if (cancelled) return;
      player = createAudioPlayer({ uri: audio_url });
      player.setPlaybackRate(options.rate / READ_OUT_RATE.normal);
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish && !cancelled) {
          cancelled = true;
          player?.remove();
          options.onDone();
        }
      });
      player.play();
    })
    .catch(() => {
      // No cloud voice (offline, or mock data): the phone's voice is better than silence.
      if (!cancelled) stopDevice = speakOnDevice(text, options);
    });

  return () => {
    cancelled = true;
    player?.remove();
    stopDevice?.();
  };
}
