import { api } from './client';

// The paid services (hourly-rate listings and their bookings) are Wisdom: they live in api/wisdom.ts.
export type StallSlot = 'first' | 'second' | 'whole';
export interface Stall { id: string; seller: string; selling: string; helper_name: string | null; slot: StallSlot; mine: boolean }
export interface Stalls { activity: { id: string; title: string; starts_at: string; is_market: boolean }; stalls: Stall[] }
export const getStalls = (activityId: string) => api<Stalls>('GET', `/v1/market/stalls/${activityId}`);
export const reserveStall = (activityId: string, selling: string, helper_name?: string, slot: StallSlot = 'whole') => api<{ id: string }>('POST', `/v1/market/stalls/${activityId}`, { selling, helper_name, slot });
export const cancelStall = (activityId: string) => api<{ cancelled: boolean }>('DELETE', `/v1/market/stalls/${activityId}`);
export interface MarketSummary { waiting_for_me: number; my_listings: number }

// ---- market days: a day at an Active Ageing Centre, a mall or a community centre; once, weekly or monthly ----
export interface MarketEventCard { id: string; title: string; description: string | null; venue_name: string; address: string | null; starts_at: string; ends_at: string | null; stalls_total: number; stalls_left: number; going_count: number; i_going: boolean; repeat: 'weekly' | 'monthly' | null; kind: 'market_day' | 'volunteer' | 'gig' | 'show' | 'activity'; intents: ('earn' | 'contribute' | 'volunteer' | 'enjoy')[]; host: string | null; source: string; external_url: string | null; my_communities: { community_id: string; name: string; going: number }[] }
export interface MarketEventDetail extends MarketEventCard { stalls: { id: string; selling: string; kind: string; helper_name: string | null; slot: string; seller: string; community: string | null; mine: boolean }[] }
export const getMarketEvents = (intent?: string) => api<{ events: MarketEventCard[] }>('GET', `/v1/market/events?limit=20${intent ? `&intent=${intent}` : ''}`).then((r) => r.events);
export const getMarketEvent = (id: string) => api<MarketEventDetail>('GET', `/v1/market/events/${id}`);
export const setMarketGoing = (id: string, going: boolean) => api<{ going: boolean }>('POST', `/v1/market/events/${id}/going`, { going });
export const takeMarketStall = (id: string, b: { selling: string; slot: 'first' | 'second' | 'whole'; kind: 'goods' | 'skill'; helper_name?: string }) => api<{ id?: string }>('POST', `/v1/market/events/${id}/stall`, b);
export const cancelMarketStall = (id: string) => api<{ cancelled?: boolean }>('DELETE', `/v1/market/events/${id}/stall`);
