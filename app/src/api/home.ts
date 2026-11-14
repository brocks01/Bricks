import { api } from './client';
import type { Limits } from './communityRules';
import type { HealthSummary } from './health';
import type { MarketSummary } from './market';

export interface HomeSummary { health: HealthSummary; communities: Limits; market: MarketSummary; help_alerts: number }
export const getHomeSummary = () => api<HomeSummary>('GET', '/v1/home/summary');
