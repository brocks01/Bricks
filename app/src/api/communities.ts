import { api } from './client';
import type { Audience, Circle } from './communityRules';

export interface MyCommunity {
  id: string;
  name: string;
  kind: string;
  icon: string;
  cover_url: string | null;
  area_name: string | null;
  description: string | null;
  member_count: number;
  my_role: string;
  is_demo: boolean;
}

/** The communities the signed-in person belongs to (empty for someone new). */
export const getMyCommunities = () => api<{ communities: MyCommunity[] }>('GET', '/v1/communities/mine').then((r) => r.communities);

export interface Upcoming {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
  image_url: string | null;
  community_id: string;
  community_name: string;
  community_icon: string;
  i_going: boolean;
  i_attended: boolean;
  category: string | null;
  going_count: number;
  going_names: string[]; // up to three other members who said yes
}

/** The next few activities across all the person's communities. */
export const getUpcoming = (limit = 3) => api<{ activities: Upcoming[] }>('GET', `/v1/communities/upcoming?limit=${limit}`).then((r) => r.activities);

/** Say "I am going" (or not) to an activity. Returns the new number going. */
export const setGoing = (activityId: string, going: boolean) => api<{ going: boolean; going_count: number }>('POST', `/v1/communities/activities/${activityId}/going`, { going });

export interface CommunityDetail {
  community: { id: string; name: string; kind: string; description: string | null; area_name: string | null; privacy: string; logo_url: string | null; cover_url: string | null; member_count: number; is_demo: boolean; invite_code: string | null; signature_product: string | null; meeting: string | null; circle: Circle; audience: Audience; source: 'people' | 'imported'; host_name: string | null };
  my_role: string;
  can_manage: boolean;
  /** Family members who are in this community and chose to let their family see it. */
  family_here?: { id: string; name: string }[];
  /** Whether I let my family see that I am here. */
  my_share?: boolean;
  announcements: { id: string; title: string; body: string; pinned: boolean; author: string | null; created_at: string }[];
  activities: { id: string; title: string; description: string | null; category: string | null; starts_at: string; ends_at: string | null; location: string | null; capacity: number | null; image_url: string | null; going_count: number; i_going: boolean }[];
  members: { id: string; name: string; area: string | null; role: string }[];
  contributions: { count: number; hours: number; people: number; my_count: number; my_hours: number };
  opportunities: { id: string; kind: string; title: string; description: string | null; contact: string | null; created_at: string }[];
}

/** One community the person belongs to, with its updates, activities, members and totals. */
export const getCommunity = (id: string) => api<CommunityDetail>('GET', `/v1/communities/${id}`);

// ---- Community screens (events, activities, people, invite, initiatives, one update) ----
export interface CommunityActivity {
  id: string;
  community_id: string;
  title: string;
  description: string | null;
  category: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  capacity: number | null;
  image_url: string | null;
  status: string;
  going_count: number;
  i_going: boolean;
  repeat: 'daily' | 'weekdays' | 'weekly' | 'monthly' | null;
}
export type ActivityWhen = 'upcoming' | 'mine' | 'past';
export const getActivities = (cid: string, when: ActivityWhen = 'upcoming', category?: string) =>
  api<{ activities: CommunityActivity[] }>('GET', `/v1/communities/${cid}/activities?when=${when}${category ? `&category=${encodeURIComponent(category)}` : ''}`).then((r) => r.activities);
export const getActivityCategories = (cid: string) =>
  api<{ categories: { name: string; ongoing: number; completed: number; image_url: string | null }[] }>('GET', `/v1/communities/${cid}/activity-categories`).then((r) => r.categories);
export const getActivity = (id: string) => api<CommunityActivity & { organiser: string | null; going: { id: string; name: string }[] }>('GET', `/v1/communities/activities/${id}`);
export const createActivity = (cid: string, body: { title: string; starts_at: string; ends_at?: string; location?: string; category?: string; description?: string; capacity?: number; repeat?: 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' }) =>
  api<{ id: string }>('POST', `/v1/communities/${cid}/activities`, body);
/** The circle's people. Who is away comes back only for the ones who chose to share it, and only as away (with where and since). */
export const getMembers = (cid: string, q?: string) => api<{ members: { id: string; name: string; area: string | null; role: string; away?: boolean; away_place?: string | null; away_since?: string | null }[] }>('GET', `/v1/communities/${cid}/members${q ? `?q=${encodeURIComponent(q)}` : ''}`).then((r) => r.members);
export const getInvite = (cid: string) => api<{ name: string; can_invite: boolean; invite_code: string | null }>('GET', `/v1/communities/${cid}/invite`);
export interface Initiative { id: string; title: string; summary: string | null; icon: string; status: string; member_count: number }
export const getInitiatives = (cid: string) => api<{ initiatives: Initiative[] }>('GET', `/v1/communities/${cid}/initiatives`).then((r) => r.initiatives);
export const getInitiative = (id: string) => api<Initiative & { community_id: string; description: string | null; image_url: string | null; current_plan: string | null; joined: boolean }>('GET', `/v1/communities/initiatives/${id}`);
export const joinInitiative = (id: string, joined: boolean) => api<{ joined: boolean; member_count: number }>('POST', `/v1/communities/initiatives/${id}/join`, { joined });
export const createInitiative = (cid: string, body: { title: string; summary?: string; description?: string; current_plan?: string }) => api<{ id: string }>('POST', `/v1/communities/${cid}/initiatives`, body);
export interface UpdateDetail { id: string; community_id: string; title: string; body: string; author: string | null; created_at: string; likes: number; i_like: boolean; comments: { id: string; name: string; body: string; created_at: string }[] }
export const getUpdate = (id: string) => api<UpdateDetail>('GET', `/v1/communities/updates/${id}`);
export const commentOnUpdate = (id: string, body: string) => api<UpdateDetail>('POST', `/v1/communities/updates/${id}/comments`, { body });
export const likeUpdate = (id: string, liked: boolean) => api<{ liked: boolean; likes: number }>('POST', `/v1/communities/updates/${id}/like`, { liked });

/** Join a community with the invite code a leader gave you. Returns its id. Refused with code_invalid when no community has that code. */
export const joinCommunity = (code: string) => api<{ id: string }>('POST', '/v1/communities/join', { code });
export type CommunityKind = 'apartment' | 'block' | 'neighbourhood' | 'club' | 'other';
/** Start a community; the creator becomes its Community Lead and gets the invite code to share. */
export const createCommunity = (body: { name: string; kind: CommunityKind; area_name?: string; description?: string }) => api<{ id: string }>('POST', '/v1/communities', body);

/** How often the person comes to one community (check-ins only): this month, streaks, level, and the regulars of the month. */
export interface Standing { this_month: number; last_month: number; total: number; day_streak: number; week_streak: number; level: 'newcomer' | 'regular' | 'stalwart'; regulars: { name: string; times: number; me: boolean }[] }
export const getStanding = (cid: string) => api<Standing>('GET', `/v1/communities/${cid}/standing`);
