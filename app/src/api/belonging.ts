import { api } from './client';

// The belonging layer: the days a circle keeps, who is away (only when they chose to share it), what people send for a day
// from wherever they are, and the circle's stories. Only a member of a circle reads any of it.

export interface CircleDay { id: string; name: string; tradition: string | null; starts_on: string; ends_on: string; days_to_go: number; festival_id: string | null }
export interface Festival { id: string; name: string; tradition: string | null; regions: string[]; starts_on: string; ends_on: string }

/** One circle's coming days, soonest first, each with how many days to go. */
export const getDays = (cid: string) => api<{ days: CircleDay[] }>('GET', `/v1/communities/${cid}/days`).then((r) => r.days);
/** A leader gives the circle a day to keep: from the festival calendar (its real dates come with it) or a day of its own. */
export const addDay = (cid: string, body: { festival_id?: string; name?: string; starts_on?: string; ends_on?: string; tradition?: string }) =>
  api<{ id: string; kept: boolean }>('POST', `/v1/communities/${cid}/days`, body);
/** A leader takes a day off the circle. */
export const removeDay = (cid: string, dayId: string) => api<{ removed: boolean }>('DELETE', `/v1/communities/${cid}/days/${dayId}`);
/** The festival calendar a leader picks from (platform admins enter the real dates). */
export const getFestivals = () => api<{ festivals: Festival[] }>('GET', '/v1/festivals').then((r) => r.festivals);

export interface Presence { status: 'here' | 'away'; place: string | null; share: boolean; since: string | null }
/** The person's own presence in a circle. Never anyone else's. */
export const getPresence = (cid: string) => api<Presence>('GET', `/v1/communities/${cid}/presence`);
/** Say you are away (with where, if you want) or back, and choose whether the circle may see it. Off unless you turn it on. */
export const setPresence = (cid: string, body: { status: 'here' | 'away'; place?: string | null; share?: boolean | null }) =>
  api<Presence>('PUT', `/v1/communities/${cid}/presence`, body);

export type ContributionKind = 'blessing' | 'message' | 'recipe' | 'story';
export interface Contribution { id: string; kind: ContributionKind; body: string; audio_url: string | null; hidden: boolean; by: string; day_id: string | null; created_at: string | null }
/** What the circle sent for its days, newest first. Hidden ones are for the leaders only. */
export const getContributions = (cid: string, dayId?: string) =>
  api<{ contributions: Contribution[]; can_hide: boolean }>('GET', `/v1/communities/${cid}/contributions${dayId ? `?day_id=${dayId}` : ''}`);
/** Send something for one of the circle's days, from wherever you are. */
export const addContribution = (cid: string, body: { day_id?: string | null; kind: ContributionKind; body: string }) =>
  api<{ id: string; kind: string; day_id: string | null }>('POST', `/v1/communities/${cid}/contributions`, body);
/** A leader takes one contribution out of the circle's view (never deleted). */
export const hideContribution = (id: string) => api<{ hidden: boolean }>('POST', `/v1/communities/contributions/${id}/hide`);

export interface CircleStory { id: string; title: string; body: string; kind: string; by: string; created_at: string | null }
/** The stories members shared into this circle. Only members read them. */
export const getCircleStories = (cid: string) => api<{ stories: CircleStory[] }>('GET', `/v1/communities/${cid}/stories`).then((r) => r.stories);
/** Share one of my own Wisdom stories into a circle I am in; without a community it takes it back. */
export const shareStoryToCircle = (capsuleId: string, communityId: string | null) =>
  api<{ shared: boolean; community_id: string | null }>('POST', `/v1/wisdom/capsules/${capsuleId}/share-to-circle`, { community_id: communityId });
