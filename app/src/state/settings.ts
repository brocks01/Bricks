import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isLanguage, type Language } from '@/i18n/languages';

/**
 * Per-device preferences. Server-owned profile data (name, area, channel) lives
 * in the API layer, not here.
 */
export interface SettingsState {
  /** null until the member picks one; we follow the device language until then. */
  language: Language | null;
  readOut: {
    /** expo-speech rate. 0.85 is "slow and clear" for seniors. */
    rate: number;
    /** Read each screen automatically when it opens (on in Simple Mode later). */
    autoRead: boolean;
  };
  setLanguage: (language: Language) => void;
  setReadOutRate: (rate: number) => void;
  setAutoRead: (autoRead: boolean) => void;
}

export const READ_OUT_RATE = { slow: 0.75, normal: 0.85, min: 0.5, max: 1.2 } as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: null,
      readOut: { rate: READ_OUT_RATE.normal, autoRead: false },
      setLanguage: (language) => set({ language }),
      setReadOutRate: (rate) =>
        set((s) => ({
          readOut: { ...s.readOut, rate: clamp(rate, READ_OUT_RATE.min, READ_OUT_RATE.max) },
        })),
      setAutoRead: (autoRead) => set((s) => ({ readOut: { ...s.readOut, autoRead } })),
    }),
    {
      name: 'kc.settings',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ language, readOut }) => ({ language, readOut }),
      // Never trust stored values blindly: a bad value must not break startup.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        return {
          ...current,
          language: isLanguage(p.language) ? p.language : current.language,
          readOut: {
            rate:
              typeof p.readOut?.rate === 'number'
                ? clamp(p.readOut.rate, READ_OUT_RATE.min, READ_OUT_RATE.max)
                : current.readOut.rate,
            autoRead:
              typeof p.readOut?.autoRead === 'boolean'
                ? p.readOut.autoRead
                : current.readOut.autoRead,
          },
        };
      },
    },
  ),
);

/** True once saved settings are loaded, so we never flash the wrong language. */
export function useSettingsHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useSettings.persist.onFinishHydration(onChange),
    () => useSettings.persist.hasHydrated(),
  );
}
