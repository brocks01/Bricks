import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { INTERESTS, type Interest, type NewSafeCircleMember } from '@/api/types';

/**
 * Onboarding progress (S1–S9), kept on the phone so closing the app half-way
 * picks up where they left off (ON-7). The answers go to the server together at
 * the end of the Myself path; the Family path sends an invite instead.
 */

export type OnboardingPath = 'self' | 'family';

export interface OnboardingDraft {
  name: string;
  preferredName: string;
  area: string;
  interests: Interest[];
  safeCircle: NewSafeCircleMember[];
  singpassVerified: boolean;
  /** The voice intro recorded at S5, uploaded at the end. */
  intro: { uri: string; durationS: number } | null;
}

export interface OnboardingState {
  /** True once they reach Home (or the Family view). Then the app opens on Home. */
  completed: boolean;
  path: OnboardingPath | null;
  /** The onboarding screen they were last on, to resume there. */
  resumeAt: string | null;
  draft: OnboardingDraft;
  setPath: (path: OnboardingPath) => void;
  setResumeAt: (route: string) => void;
  updateDraft: (patch: Partial<OnboardingDraft>) => void;
  complete: () => void;
  /** Sign out: back to the language screen with nothing filled in. */
  reset: () => void;
}

const EMPTY_DRAFT: OnboardingDraft = {
  name: '',
  preferredName: '',
  area: '',
  interests: [],
  safeCircle: [],
  singpassVerified: false,
  intro: null,
};

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      path: null,
      resumeAt: null,
      draft: EMPTY_DRAFT,
      setPath: (path) => set({ path }),
      setResumeAt: (resumeAt) => set({ resumeAt }),
      updateDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      complete: () => set({ completed: true, resumeAt: null, draft: EMPTY_DRAFT }),
      reset: () => set({ completed: false, path: null, resumeAt: null, draft: EMPTY_DRAFT }),
    }),
    {
      name: 'bricks.onboarding',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ completed, path, resumeAt, draft }) => ({ completed, path, resumeAt, draft }),
      // Stored values are checked, so a bad value can't break startup.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<OnboardingState>;
        const d = (p.draft ?? {}) as Partial<OnboardingDraft>;
        const text = (v: unknown) => (typeof v === 'string' ? v : '');
        return {
          ...current,
          completed: p.completed === true,
          path: p.path === 'self' || p.path === 'family' ? p.path : null,
          resumeAt:
            typeof p.resumeAt === 'string' && p.resumeAt.startsWith('/onboarding')
              ? p.resumeAt
              : null,
          draft: {
            name: text(d.name),
            preferredName: text(d.preferredName),
            area: text(d.area),
            interests: Array.isArray(d.interests)
              ? d.interests.filter((i): i is Interest =>
                  (INTERESTS as readonly string[]).includes(i),
                )
              : [],
            safeCircle: Array.isArray(d.safeCircle) ? d.safeCircle.slice(0, 5) : [],
            singpassVerified: d.singpassVerified === true,
            intro:
              d.intro && typeof d.intro.uri === 'string' && typeof d.intro.durationS === 'number'
                ? d.intro
                : null,
          },
        };
      },
    },
  ),
);

/** True once saved onboarding progress is loaded, so the app opens in the right place. */
export function useOnboardingHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useOnboarding.persist.onFinishHydration(onChange),
    () => useOnboarding.persist.hasHydrated(),
  );
}
