import { api } from './client';

export interface MyCommunity {
  id: string;
  name: string;
  kind: string;
  area_name: string | null;
  description: string | null;
  member_count: number;
  my_role: string;
  is_demo: boolean;
}

/** The communities the signed-in person belongs to (empty for someone new). */
export const getMyCommunities = () => api<{ communities: MyCommunity[] }>('GET', '/v1/communities/mine').then((r) => r.communities);
