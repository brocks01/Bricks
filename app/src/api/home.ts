import { api } from './client';
import type { Limits } from './communityRules';
import type { HealthSummary } from './health';
import type { MarketSummary } from './market';

export interface HomeSummary { health: HealthSummary; communities: Limits; market: MarketSummary; help_alerts: number }
export const getHomeSummary = () => api<HomeSummary>('GET', '/v1/home/summary');

/** One upcoming event on Home: a community gathering, a market event the person is going to, or a Wisdom session. */
export type EventSource = 'community' | 'market' | 'wisdom';
export interface HomeEvent {
  source: EventSource;
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  place: string | null;
  from_name: string | null; // the community's name, the host's name, or the other person's name
  image_url: string | null;
  going: boolean;
  open_key: string; // the page that shows it
  open_params: Record<string, string>;
}
/** From a few hours ago to `days` ahead (30 by default, at most 92), soonest first. `total` is how many there are before `limit`. */
export const getHomeUpcoming = (days = 30, limit = 100) => api<{ events: HomeEvent[]; total: number }>('GET', `/v1/home/upcoming?days=${days}&limit=${limit}`);
