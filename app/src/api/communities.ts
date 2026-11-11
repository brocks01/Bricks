import { api } from './client';

export interface MyCommunity {
  id: string;
  name: string;
  kind: string;
  icon: string;
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
}

/** The next few activities across all the person's communities. */
export const getUpcoming = (limit = 3) => api<{ activities: Upcoming[] }>('GET', `/v1/communities/upcoming?limit=${limit}`).then((r) => r.activities);

/** Say "I am going" (or not) to an activity. Returns the new number going. */
export const setGoing = (activityId: string, going: boolean) => api<{ going: boolean; going_count: number }>('POST', `/v1/communities/activities/${activityId}/going`, { going });

export interface CommunityDetail {
  community: { id: string; name: string; kind: string; description: string | null; area_name: string | null; privacy: string; logo_url: string | null; cover_url: string | null; member_count: number; is_demo: boolean; invite_code: string | null };
  my_role: string;
  can_manage: boolean;
  announcements: { id: string; title: string; body: string; pinned: boolean; author: string | null; created_at: string }[];
  activities: { id: string; title: string; description: string | null; category: string | null; starts_at: string; ends_at: string | null; location: string | null; capacity: number | null; image_url: string | null; going_count: number; i_going: boolean }[];
  members: { id: string; name: string; area: string | null; role: string }[];
  contributions: { count: number; hours: number; people: number; my_count: number; my_hours: number };
  opportunities: { id: string; kind: string; title: string; description: string | null; contact: string | null; created_at: string }[];
}

/** One community the person belongs to, with its updates, activities, members and totals. */
export const getCommunity = (id: string) => api<CommunityDetail>('GET', `/v1/communities/${id}`);
