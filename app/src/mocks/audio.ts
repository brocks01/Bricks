import { Asset } from 'expo-asset';

/**
 * Sample voice notes for the mock Thank-You Wall and voice intro. Recorded with a
 * synthetic English voice; the backend seed replaces them with real recordings.
 */
function uriOf(moduleId: number, fallback: string): string {
  try {
    return Asset.fromModule(moduleId).uri || fallback;
  } catch {
    return fallback;
  }
}

export const sampleAudio = {
  introRaj: uriOf(require('../../assets/audio/intro-raj.wav'), 'mock://audio/intro-raj.wav'),
  thanksDavid: uriOf(
    require('../../assets/audio/thanks-david.wav'),
    'mock://audio/thanks-david.wav',
  ),
  thanksSiti: uriOf(require('../../assets/audio/thanks-siti.wav'), 'mock://audio/thanks-siti.wav'),
};
