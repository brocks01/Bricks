import { api } from './client';

export interface WeekDay { day: string; moved: boolean | null; feeling: number | null; minutes: number }
export interface HealthStatus { day: string; answered: boolean; moved: boolean | null; feeling: number | null; streak: number; week: WeekDay[] }
export const getHealthStatus = () => api<HealthStatus>('GET', '/v1/health/status');
export const sendCheckin = (moved: boolean, feeling?: number) => api<{ day: string; moved: boolean; feeling: number | null }>('POST', '/v1/health/checkin', { moved, feeling });

export interface HealthSummary { answered: boolean; moved: boolean | null; streak: number; week_minutes: number; week_steps: number; week_distance_m: number; week_walks: number; last_week_walks: number; last_week_minutes: number; has_card: boolean }
export const getHealthSummary = () => api<HealthSummary>('GET', '/v1/health/summary');

export interface Walk { id: string; started_at: string; duration_s: number; moving_s: number; distance_m: number; steps: number; avg_pace_s_km: number | null }
export interface WalkTotals { walks: number; distance_m: number; steps: number; minutes: number }
export const getWalks = () => api<{ walks: Walk[]; this_week: WalkTotals; last_week: WalkTotals }>('GET', '/v1/health/walks');
export const saveWalk = (body: { started_at: string; duration_s: number; moving_s: number; distance_m: number; steps: number }) => api<{ id: string; avg_pace_s_km: number | null }>('POST', '/v1/health/walks', body);
export const deleteWalk = (id: string) => api<{ deleted: boolean }>('DELETE', `/v1/health/walks/${id}`);

export interface HealthCard { blood_group: string | null; conditions: string | null; medicines: string | null; allergies: string | null; contact_name: string | null; contact_phone: string | null }
export const getCard = () => api<HealthCard>('GET', '/v1/health/card');
export const putCard = (c: HealthCard) => api<HealthCard>('PUT', '/v1/health/card', c);

export const sendHelp = (message?: string) => api<{ id: string; family_told: number }>('POST', '/v1/health/help', { message });
export interface HelpAlert { id: string; from: string; message: string | null; at: string }
export const getHelpInbox = () => api<{ alerts: HelpAlert[] }>('GET', '/v1/health/help/inbox').then((r) => r.alerts);
export const closeHelp = (id: string) => api<{ closed: boolean }>('POST', `/v1/health/help/${id}/close`);
