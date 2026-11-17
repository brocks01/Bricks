import { api } from './client';

// Hosts: who runs things (an Active Ageing Centre, a mall, a community centre). The host's own owners and editors list,
// make, edit and cancel ONLY their own host's opportunities. Payment stays direct between people; we never hold money.

export type HostRole = 'owner' | 'editor' | 'admin';
export type HostKind = 'aac' | 'mall' | 'community_centre' | 'organisation' | 'other';
export type OpportunityKind = 'market_day' | 'volunteer' | 'gig' | 'show' | 'activity';
export type Intent = 'earn' | 'contribute' | 'volunteer' | 'enjoy';
export const OPPORTUNITY_KINDS: OpportunityKind[] = ['market_day', 'volunteer', 'gig', 'show', 'activity'];
export const INTENTS: Intent[] = ['earn', 'contribute', 'volunteer', 'enjoy'];
export const REPEATS = ['none', 'weekly', 'monthly'] as const;

export interface MyHost { id: string; name: string; kind: HostKind; area_name: string | null; role: HostRole }
export const getMyHosts = () => api<{ hosts: MyHost[] }>('GET', '/v1/hosts/mine').then((r) => r.hosts);

export interface HostEvent {
  id: string; title: string; kind: OpportunityKind; intents: Intent[]; venue_name: string; address: string | null; area_name: string | null;
  starts_at: string; ends_at: string | null; repeat: 'weekly' | 'monthly' | null; week_of_month: number | null;
  stalls_total: number; stalls_taken: number; stalls_left: number; going_count: number; external_url: string | null;
  stalls: { seller: string; selling: string; slot: 'first' | 'second' | 'whole' }[];
}
export const getHostEvents = (hostId: string) => api<{ events: HostEvent[] }>('GET', `/v1/hosts/${hostId}/events`).then((r) => r.events);

export interface HostEventBody {
  title: string; description?: string; venue_name: string; venue_kind?: 'mall' | 'community_centre' | 'other';
  address?: string; area_name?: string; starts_at: string; ends_at?: string; stalls_total?: number;
  repeat?: 'none' | 'weekly' | 'monthly'; kind: OpportunityKind; intents: Intent[]; external_url?: string;
  interests?: ('walking' | 'taichi' | 'cooking' | 'chess' | 'music' | 'gardening' | 'teaching' | 'tech')[]; // what it is about: used to recommend it
}
export const createHostEvent = (hostId: string, b: HostEventBody) => api<{ id?: string; created?: boolean; made?: number }>('POST', `/v1/hosts/${hostId}/events`, b);
export const cancelHostEvent = (hostId: string, eventId: string) => api<{ cancelled: boolean }>('POST', `/v1/hosts/${hostId}/events/${eventId}/cancel`);
export const endHostSeries = (hostId: string, eventId: string) => api<{ ended: boolean; cancelled: number }>('POST', `/v1/hosts/${hostId}/events/${eventId}/end-series`);
