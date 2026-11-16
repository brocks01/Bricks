import { api } from './client';

export type MarketCategory = 'crafts' | 'cooking' | 'teaching' | 'repair' | 'music' | 'wellness' | 'advice' | 'storytelling' | 'other';
export type MarketTier = 'basic' | 'skilled' | 'expert';
export const CATEGORIES: MarketCategory[] = ['crafts', 'cooking', 'teaching', 'repair', 'music', 'wellness', 'advice', 'storytelling', 'other'];
export const TIERS: MarketTier[] = ['basic', 'skilled', 'expert'];

export interface Listing { id: string; owner_id: string; owner_name: string; title: string; category: MarketCategory; description: string | null; tier: MarketTier; experience_years: number; proof_text: string | null; proof_links: string[]; verified: boolean; rate_per_hour: number | null; currency: string; area_name: string | null; status: string; endorsements: number; mine: boolean; created_at: string }
export interface ListingDetail extends Listing { endorsed_by: { name: string; note: string | null; at: string }[]; can_endorse: boolean }
export const getListings = (q = '', category?: string, mine = false) => api<{ listings: Listing[] }>('GET', `/v1/market/listings?q=${encodeURIComponent(q)}${category ? `&category=${category}` : ''}${mine ? '&mine=true' : ''}`).then((r) => r.listings);
export const getListing = (id: string) => api<ListingDetail>('GET', `/v1/market/listings/${id}`);
export interface ListingBody { title: string; category: MarketCategory; tier: MarketTier; description?: string; experience_years?: number; proof_text?: string; rate_per_hour?: number | null; area_name?: string }
export const createListing = (b: ListingBody) => api<{ id: string }>('POST', '/v1/market/listings', b);
export const updateListing = (id: string, b: Partial<ListingBody> & { status?: 'active' | 'paused' }) => api<{ id: string }>('PATCH', `/v1/market/listings/${id}`, b);
export const archiveListing = (id: string) => api<{ archived: boolean }>('DELETE', `/v1/market/listings/${id}`);
export interface Guide { tier: MarketTier; low: number; high: number; currency: string; per: string; note: string }
export const getGuide = (tier: MarketTier) => api<Guide>('GET', `/v1/market/guide?tier=${tier}`, undefined, { auth: false });

export interface Booking { id: string; listing_id: string; title: string; starts_at: string; hours: number; agreed_rate: number | null; currency: string; status: 'requested' | 'accepted' | 'declined' | 'cancelled' | 'done'; note: string | null; role: 'provider' | 'requester'; other_name: string; community_name: string | null; created_at: string }
export const getBookings = () => api<{ bookings: Booking[] }>('GET', '/v1/market/bookings').then((r) => r.bookings);
export const bookListing = (id: string, b: { starts_at: string; hours: number; note?: string; community_id?: string }) => api<{ id: string; status: string }>('POST', `/v1/market/listings/${id}/bookings`, b);
export const decideBooking = (id: string, accept: boolean) => api<{ status: string }>('POST', `/v1/market/bookings/${id}/decide`, { accept });
export const cancelBooking = (id: string) => api<{ status: string }>('POST', `/v1/market/bookings/${id}/cancel`);
export const completeBooking = (id: string) => api<{ status: string }>('POST', `/v1/market/bookings/${id}/complete`);
export const endorseListing = (id: string, note?: string) => api<{ endorsed: boolean }>('POST', `/v1/market/listings/${id}/endorse`, { note });

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
