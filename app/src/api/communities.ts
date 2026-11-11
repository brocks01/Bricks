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
