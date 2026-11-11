import { api } from './client';

export type AspirationKind = 'travel' | 'hobby' | 'health' | 'family' | 'own';
export interface Aspiration { id: string; title: string; category: AspirationKind; note: string | null; done: boolean; created_at: string }

export type HealthKind = 'heart_rate' | 'sleep_hours' | 'weight_kg' | 'blood_pressure';
export interface Reading { id: string; kind: HealthKind; value: string | number; value2: string | number | null; recorded_at: string }
export interface HealthData { latest: Record<HealthKind, { id: string; value: string | number; value2: string | number | null; recorded_at: string } | null>; recent: Reading[] }

export type ActivityKind = 'walk' | 'jog' | 'yoga' | 'exercise' | 'other';
export interface ActivityData { days: { date: string; minutes: number }[]; week_minutes: number; streak: number; recent: { id: string; kind: ActivityKind; minutes: number; logged_on: string }[] }

export type ContributionKind = 'time' | 'skill' | 'goods' | 'money';
export interface ContributionsData {
  count: number;
  hours: number;
  communities_count: number;
  recent: { id: string; kind: ContributionKind; description: string; hours: number | null; created_at: string; community_id: string; community_name: string }[];
  my_communities: { id: string; name: string }[];
}

export interface ProgressData {
  activity: { week_minutes: number; streak: number; days: { date: string; minutes: number }[] };
  health: { readings_this_month: number };
  aspirations: { total: number; done: number };
  explore: { started: number; completed: number };
  contributions: { count: number; hours: number };
}

export const getAspirations = () => api<{ aspirations: Aspiration[] }>('GET', '/v1/grow/aspirations').then((r) => r.aspirations);
export const addAspiration = (title: string, category: AspirationKind) => api<Aspiration>('POST', '/v1/grow/aspirations', { title, category });
export const setAspirationDone = (id: string, done: boolean) => api<{ id: string; done: boolean }>('POST', `/v1/grow/aspirations/${id}/done`, { done });

export const getHealth = () => api<HealthData>('GET', '/v1/grow/health');
export const addReading = (kind: HealthKind, value: number, value2?: number) => api<Reading>('POST', '/v1/grow/health/readings', { kind, value, value2 });

export const getActivity = () => api<ActivityData>('GET', '/v1/grow/activity');
export const addActivity = (kind: ActivityKind, minutes: number) => api<unknown>('POST', '/v1/grow/activity', { kind, minutes });

export const getContributions = () => api<ContributionsData>('GET', '/v1/grow/contributions');
export const addContribution = (community_id: string, kind: ContributionKind, description: string, hours?: number) => api<unknown>('POST', '/v1/grow/contributions', { community_id, kind, description, hours });

export const getProgress = () => api<ProgressData>('GET', '/v1/grow/progress');
