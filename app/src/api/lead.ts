import { api } from './client';

export interface VoteOption { id: string; name: string; count: number; mine: boolean }
export interface Vote { id: string; title: string; voters: number; members: number; options: VoteOption[]; my_pick: string | null }
export interface RotaSlot { id: string; on: string; label: string; capacity: number; names: string[]; mine: boolean; gap: number }
export interface LeadGathering { id: string; title: string; starts_at: string; people: { user_id: string; name: string; checked_in: boolean }[] }
export interface LeadView { community: { id: string; name: string }; product: string | null; since: string | null; vote: Vote | null; gatherings: LeadGathering[]; rota: RotaSlot[] }

/** Everything the Community Lead's page needs. Refused (not_a_lead) for anyone else. */
export const getLeadView = (cid: string) => api<LeadView>('GET', `/v1/communities/${cid}/lead`);
export const getVote = (cid: string) => api<{ vote: Vote | null }>('GET', `/v1/communities/${cid}/vote`).then((r) => r.vote);
export const startVote = (cid: string, title: string, options: string[]) => api<Vote>('POST', `/v1/communities/${cid}/votes`, { title, options });
export const castVote = (voteId: string, optionId: string) => api<Vote>('POST', `/v1/communities/votes/${voteId}/ballot`, { option_id: optionId });
export const closeVote = (voteId: string) => api<{ closed: boolean; winner: string | null }>('POST', `/v1/communities/votes/${voteId}/close`);

export const getRota = (cid: string) => api<{ slots: RotaSlot[] }>('GET', `/v1/communities/${cid}/rota`).then((r) => r.slots);
export const makeRota = (cid: string, weekday: number, label: string, capacity = 3, weeks = 4) => api<{ made: number }>('POST', `/v1/communities/${cid}/rota`, { weekday, label, capacity, weeks });
export const rotaSignup = (slotId: string, on: boolean) => api<{ on: boolean }>('POST', `/v1/communities/rota/${slotId}/signup`, { on });

/** "I'm here" (no user) or, for a Community Lead, "check in for them". */
export const checkIn = (activityId: string, userId?: string) => api<{ checked_in: boolean; user_id: string }>('POST', `/v1/communities/activities/${activityId}/checkin`, userId ? { user_id: userId } : {});
