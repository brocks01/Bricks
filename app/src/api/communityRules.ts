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
