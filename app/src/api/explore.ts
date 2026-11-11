import { api } from './client';

export type ExploreCategoryId = 'digital_skills' | 'health_awareness' | 'everyday_life' | 'hobbies' | 'culture' | 'knowledge';
export type ExploreFormat = 'guide' | 'video' | 'interactive' | 'story' | 'audio' | 'activity';

export interface ExploreCategory {
  id: ExploreCategoryId;
  icon: string;
  items: number;
  image_url: string | null;
  chosen: boolean;
}

/** One item in a list. `percent` and `saved` are this person's own. */
export interface ExploreItem {
  id: string;
  category_id: ExploreCategoryId;
  format: ExploreFormat;
  level: 'easy' | 'medium';
  title: string;
  summary: string;
  image_url: string | null;
  minutes: number;
  language: string;
  source: string;
  saved: boolean;
  percent: number;
  completed: boolean;
}

export interface ExploreItemDetail extends ExploreItem {
  steps: string[];
  body: string | null;
  media_url: string | null;
}

export interface ExploreHome {
  categories: ExploreCategory[];
  picked: ExploreItem[];
  continue: ExploreItem[];
  has_interests: boolean;
}

export interface ExploreMine {
  in_progress: ExploreItem[];
  completed: ExploreItem[];
  saved: ExploreItem[];
  milestones: { explored: number; completed: number; interests: number };
}

export const getExploreHome = () => api<ExploreHome>('GET', '/v1/explore/home');
export const getExploreItems = (opts: { category?: string; q?: string } = {}) => {
  const p = new URLSearchParams();
  if (opts.category) p.set('category', opts.category);
  if (opts.q && opts.q.trim()) p.set('q', opts.q.trim());
  const qs = p.toString();
  return api<{ items: ExploreItem[] }>('GET', `/v1/explore/items${qs ? `?${qs}` : ''}`).then((r) => r.items);
};
export const getExploreItem = (id: string) => api<ExploreItemDetail>('GET', `/v1/explore/items/${id}`);
export const getExploreMine = () => api<ExploreMine>('GET', '/v1/explore/mine');
export const saveExploreItem = (id: string, saved: boolean) => api<{ saved: boolean }>('POST', `/v1/explore/items/${id}/save`, { saved });
export const setExploreProgress = (id: string, percent: number) => api<{ percent: number; completed: boolean }>('POST', `/v1/explore/items/${id}/progress`, { percent });
export const getExploreInterests = () => api<{ categories: ExploreCategoryId[] }>('GET', '/v1/explore/interests').then((r) => r.categories);
export const putExploreInterests = (categories: ExploreCategoryId[]) => api<{ categories: ExploreCategoryId[] }>('PUT', '/v1/explore/interests', { categories }).then((r) => r.categories);
