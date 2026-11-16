import { createStore } from '../../core/store';
import { getProfile, type Profile, type Surface } from '../../api/wisdom';

// Who the person is to Interchange and what to show them. The backend decides (GET /v1/profile); the bottom bar and the doors read this one store.
interface ProfileState { loaded: boolean; profile: Profile | null }
export const profileStore = createStore<ProfileState>({ loaded: false, profile: null });

export async function loadProfile(): Promise<void> {
  try {
    profileStore.set({ loaded: true, profile: await getProfile() });
  } catch {
    // keep the last known profile; the app still works with the default tabs
    profileStore.set((s) => ({ ...s, loaded: true }));
  }
}

export const clearProfile = () => { onboardingLocal.done = false; profileStore.set({ loaded: false, profile: null }); };

/** Does the profile show this part of Wisdom? Before the profile is known, the original three tabs show. */
export function shows(state: ProfileState, surface: Surface): boolean {
  if (!state.profile) return surface === 'community' || surface === 'markets';
  return state.profile.surfaces.includes(surface);
}

/** The first tab this person sees: Wisdom (the heart of the product), else Communities, else the Marketplace, else their profile. */
export function firstTab(p: Profile | null): string {
  if (!p) return 'connect.index';
  if (p.surfaces.some((s) => s === 'wisdom_share' || s === 'wisdom_learn' || s === 'wisdom_help')) return 'wisdom.index';
  if (p.surfaces.includes('community')) return 'connect.index';
  if (p.surfaces.includes('markets') || p.surfaces.includes('freelance')) return 'market.index';
  return 'me.index';
}

export const showsWisdom = (state: ProfileState): boolean => !!state.profile && state.profile.surfaces.some((s) => s === 'wisdom_share' || s === 'wisdom_learn' || s === 'wisdom_help');

/** Set when the person has walked through the welcome screens in this session, so the app never sends them back even if the server has not flagged them yet (an older server, a slow save). */
export const onboardingLocal = { done: false };
