// The rules that keep communities few and good: three at most, explore, leave, family here (opt-in), creating a community by request.
import { api } from './client';
import type { CommunityKind } from './communities';

export interface Limits { max: number; used: number; left: number }
export interface FamilyHere { id: string; name: string }
export type Circle = 'origin' | 'faith' | 'place' | 'life' | 'interest';
export type Audience = 'all' | 'men' | 'women';
export interface ExploreCommunity { id: string; name: string; kind: CommunityKind; area_name: string | null; description: string | null; privacy: 'open' | 'invite'; icon: string | null; logo_url: string | null; cover_url: string | null; circle: Circle; audience: Audience; source: 'people' | 'imported'; host_name?: string | null; member_count: number; joined: boolean; family_here: FamilyHere[]; can_join: boolean }

export const getLimits = () => api<Limits>('GET', '/v1/communities/limits');
export const exploreCommunities = (q = '') => api<{ limits: Limits; communities: ExploreCommunity[] }>('GET', `/v1/communities/explore?q=${encodeURIComponent(q)}`);
/** Joins an open community. Refused with community_limit when it would be the person's fourth. */
export const joinOpenCommunity = (id: string) => api<{ id: string }>('POST', `/v1/communities/${id}/join`);
/** Leaves a community. Refused with last_lead when the person is its only leader and others are in it. */
export const leaveCommunity = (id: string) => api<{ left: boolean }>('POST', `/v1/communities/${id}/leave`);
export const shareWithFamily = (id: string, share: boolean) => api<{ share: boolean }>('POST', `/v1/communities/${id}/share`, { share });

export interface Experience { eligible: boolean; days_member: number; events_attended: number; leads: number; need_days: number; need_events: number; is_admin: boolean }
export const getExperience = () => api<Experience>('GET', '/v1/communities/experience');

export interface CommunityRequest { id: string; name: string; kind: CommunityKind; area_name: string | null; circle: Circle; audience: Audience; status: 'pending' | 'approved' | 'declined' | 'used'; note: string | null; community_id: string | null; created_at: string }
export const requestCommunity = (body: { name: string; kind: CommunityKind; circle: Circle; audience: Audience; area_name?: string; description?: string; why?: string; product?: string; meeting?: string }) => api<{ id: string; status: string }>('POST', '/v1/communities/requests', body);
export const getMyRequests = () => api<{ requests: CommunityRequest[] }>('GET', '/v1/communities/requests/mine').then((r) => r.requests);
export const createFromRequest = (id: string) => api<{ id: string }>('POST', `/v1/communities/requests/${id}/create`);

export interface ReviewRequest { id: string; name: string; kind: CommunityKind; area_name: string | null; description: string | null; why: string | null; circle: Circle; audience: Audience; by: string; created_at: string }
export const getReviewQueue = () => api<{ requests: ReviewRequest[] }>('GET', '/v1/communities/requests/review').then((r) => r.requests);
export const decideRequest = (id: string, approve: boolean, note?: string) => api<{ status: string }>('POST', `/v1/communities/requests/${id}/decide`, { approve, note });

// ---- Finding communities (revamp v2): one card shape for every list, ranked for the person ----
export type InterestKey = 'walking' | 'taichi' | 'cooking' | 'chess' | 'music' | 'gardening' | 'teaching' | 'tech';
export type CardReason = { kind: 'near'; km: number | null; area: string | null } | { kind: 'interest'; key: InterestKey };
export interface CommunityCard {
  id: string; name: string; description: string | null; cover_url: string | null; icon: string | null; audience: Audience; circle: Circle; source: 'people' | 'imported';
  host_name: string | null; privacy: 'open' | 'invite'; area_name: string | null; address: string | null; interests: InterestKey[]; member_count: number;
  faces: { name: string | null; avatar_url: string | null }[]; leader: string | null; leader_name: string | null;
  next_event: { title: string; starts_at: string; place: string | null } | null; distance_km: number | null; reasons: CardReason[];
  is_member: boolean; can_manage: boolean; has_whatsapp: boolean; whatsapp_url: string | null; events_url: string | null;
}
export interface AboutEvent { id: string; title: string; starts_at: string; ends_at: string | null; location: string | null; image_url: string | null; going_count: number }
/** Open communities the person is not in, best first (shared interests, then how near, then size). Searchable. */
export const recommendedCommunities = (q = '', limit = 10) =>
  api<{ limits: Limits; communities: CommunityCard[] }>('GET', `/v1/communities/recommended?q=${encodeURIComponent(q)}&limit=${limit}`);
/** The person's own communities as cards (members see the WhatsApp link). */
export const myCommunityCards = () => api<{ communities: CommunityCard[] }>('GET', '/v1/communities/cards/mine').then((r) => r.communities);
/** What anyone signed in may see before joining: the card and, for an open community, what is coming up. */
export const communityAbout = (id: string) => api<{ community: CommunityCard; events: AboutEvent[]; can_manage: boolean }>('GET', `/v1/communities/${id}/about`);
/** A Community Lead or a platform admin saves the meeting place, the WhatsApp group link, the interests and the events page. */
export const saveCommunityDetails = (id: string, body: { address?: string; whatsapp_url?: string; events_url?: string; interests?: InterestKey[] }) =>
  api<{ community: CommunityCard; events: AboutEvent[]; can_manage: boolean }>('PATCH', `/v1/communities/${id}/details`, body);
