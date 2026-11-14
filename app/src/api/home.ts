import { api } from './client';
import type { Limits } from './communityRules';
import type { HealthSummary } from './health';
import type { MarketSummary } from './market';

export interface HomeSummary { health: HealthSummary; communities: Limits; market: MarketSummary; help_alerts: number }
export const getHomeSummary = () => api<HomeSummary>('GET', '/v1/home/summary');

/** One dated thing on the calendar: a reminder, an appointment, a booked service, or an event the person said they are going to. */
export interface Occurrence { item_id: string | null; occurs_at: string; kind: string; title: string; note: string | null; duration_min: number | null; status: 'pending' | 'done' | 'skipped'; remind_before_min: number; activity_id?: string; community_id?: string; added_by_name: string }
export const getOccurrences = (from: Date, to: Date) => api<{ occurrences: Occurrence[] }>('GET', `/v1/calendar/occurrences?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`).then((r) => r.occurrences);
