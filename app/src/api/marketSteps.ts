import { api } from './client';

// The circle's weekly steps toward its stall before a market day ("four weeks of herbs, one market day"):
// the circle that plans the visit sets small steps, its members see them and tick them off together.

export interface Milestone { id: string; title: string; due_on: string | null; done: boolean; community: string }
export interface MilestoneList { milestones: Milestone[]; can_add: boolean; my_community_id: string | null }
export const getMilestones = (eventId: string) => api<MilestoneList>('GET', `/v1/market/events/${eventId}/milestones`);
export const addMilestone = (eventId: string, b: { community_id: string; title: string; due_on?: string }) =>
  api<{ id: string; title: string; added: boolean }>('POST', `/v1/market/events/${eventId}/milestones`, b);
export const tickMilestone = (eventId: string, milestoneId: string, done = true) =>
  api<{ done: boolean }>('POST', `/v1/market/events/${eventId}/milestones/${milestoneId}/tick`, { done });
