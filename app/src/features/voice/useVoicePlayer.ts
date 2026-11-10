import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect } from 'react';

import { useReadOut } from '@/features/readout/ReadOutProvider';

export interface VoicePlayback {
  playing: boolean;
  /** Seconds; 0 until the audio has loaded. */
  duration: number;
  /** Seconds played so far. */
  position: number;
  toggle: () => void;
}

/**
 * Plays one voice note (thank-yous, voice intros, stories). Starting playback
 * stops Read It Out, so two voices never talk over each other. When a note ends
 * it rewinds, so "Play" always starts from the beginning again.
 */
export function useVoicePlayer(uri: string | null | undefined): VoicePlayback {
  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);
  const { stop: stopReadOut } = useReadOut();

  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      void player.seekTo(0).catch(() => {});
    }
  }, [status.didJustFinish, player]);

  const toggle = useCallback(() => {
    if (!uri) return;
    if (status.playing) {
      player.pause();
    } else {
      stopReadOut();
      player.play();
    }
  }, [uri, status.playing, player, stopReadOut]);

  return {
    playing: status.playing,
    duration: status.duration || 0,
    position: status.currentTime || 0,
    toggle,
  };
}
