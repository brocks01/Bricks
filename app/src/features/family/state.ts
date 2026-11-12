import { familyApi, type FamilySummary } from '../../api/family';
import { createStore, useStore } from '../../core/store';
import { sessionStore } from '../../session/store';

/**
 * The families of the signed-in person, kept once so the tab bar can show or hide the Family tab
 * (rule: the tab is only there when you actually belong to a family) without every page fetching again.
 */
interface FamilyState {
  families: FamilySummary[] | null; // null = not loaded yet: the Family tab stays hidden
}

export const familyStore = createStore<FamilyState>({ families: null });

export function useFamilies(): FamilyState {
  return useStore(familyStore);
}

/** Throw away the saved list after creating, joining, leaving or set-up, so the next reader fetches again. */
export function invalidateFamilies(): void {
  familyStore.set({ families: null });
}

export async function loadFamilies(): Promise<void> {
  if (sessionStore.get().status !== 'in') return;
  const r = await familyApi.mine();
  familyStore.set({ families: r.families });
}
