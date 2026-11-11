// Phones: voice in the app needs a development build (Expo Go has no live audio stream), so for now the agent works by text here.
// The web version is audio.web.ts. Same functions, so the rest of the app does not care.

export const audioAvailable = (): boolean => false;
export async function startMic(_onChunk: (b64pcm: string) => void): Promise<void> {
  throw new Error('no_mic');
}
export function stopMic(): void {}
export function playPcm24k(_data: string): void {}
export function stopPlayback(): void {}
export const isSpeaking = (): boolean => false;
