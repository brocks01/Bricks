import Constants from 'expo-constants';

/**
 * Runtime configuration. Only EXPO_PUBLIC_* variables are inlined into the bundle,
 * and they must be read with static `process.env.EXPO_PUBLIC_X` access.
 */

type Variant = 'development' | 'preview' | 'production';

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true';
}

function readVariant(): Variant {
  const value = (Constants.expoConfig?.extra as { variant?: unknown } | undefined)?.variant;
  return value === 'preview' || value === 'production' ? value : 'development';
}

function readApiUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.toString().replace(/\/$/, '');
  } catch {
    if (__DEV__) console.warn(`[config] EXPO_PUBLIC_API_URL is not a valid URL: ${value}`);
    return null;
  }
}

const variant = readVariant();
const apiUrl = readApiUrl(process.env.EXPO_PUBLIC_API_URL);
const useMocks = readBoolean(process.env.EXPO_PUBLIC_USE_MOCKS, true);

export const config = {
  variant,
  /** null when unset: the app must then run on mocks. */
  apiUrl,
  useMocks,
  /**
   * Running on mock data, where there is no speech-to-text: voice screens show a
   * labelled "Demo: tap what was said" list, and demo-only controls appear.
   */
  demoVoice: useMocks || !apiUrl,
  /** Hidden developer screens (component gallery, account switcher). */
  devTools: readBoolean(process.env.EXPO_PUBLIC_DEV_TOOLS, __DEV__) && variant !== 'production',
  /** Emergency number shown on the SOS screen. 995 in Singapore; 112 for India later. */
  emergencyNumber: '995',
} as const;
