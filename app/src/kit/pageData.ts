import { useEffect, useRef } from 'react';
import { registerControl } from '../agent/pageControls';
import type { AgentPolicy } from '../navigation/types';

/**
 * What a screen is showing, as plain data, so the agent can describe it instead of guessing.
 *
 * A page declaration (page.ts) is fixed at start-up: it knows the elements, never how many communities or
 * events happen to be on screen. A screen calls usePageData(page, data) with the things it is actually
 * showing right now, and `read` gives them back to the agent. Each action also becomes a real control, so
 * the agent presses it through the screen (the screen's own handler runs) and never calls the backend.
 *
 * Plain data, no React in the shape: the self-test calls publishPageData directly.
 */

/** One thing the person can do from this screen right now. */
export interface PageDataAction {
  /** Letters and digits, unique on this page, for example 'community1' or 'rsvpEvent2'. */
  id: string;
  /** What the person reads: the community's name, the event's title. Never a key or an element id. */
  label: string;
  /** Filled in when it is published: the key the press tool uses, `<page>.<id>`. Only set when `run` is. */
  key?: string;
  /** What pressing it does - the screen's own handler, so the agent acts through the screen. */
  run?: () => void | Promise<void>;
  /** Who may do it: 'free' (the default), 'confirm' or 'human'. The same three tiers as page.ts. */
  agent?: AgentPolicy;
}

/** A picture on the screen: where it comes from and what it shows, for a person who cannot see it. */
export interface PageDataImage {
  uri: string;
  alt: string;
}

/** One row of a list: a community card, an event, an update. */
export interface PageDataItem {
  label: string;
  detail?: string; // one short line: "128 members", "Bedok Heritage Kakis · Sun, 16 Nov, 6:00"
  image?: PageDataImage;
  actions?: PageDataAction[];
}

export interface PageDataList {
  label: string; // the heading the screen gives this list
  items: PageDataItem[];
}

/** A short text value on the screen: the search box as typed, the member count. */
export interface PageDataValue {
  label: string;
  value: string;
}

export interface PageData {
  page: string;
  values: PageDataValue[];
  images: (PageDataImage & { label?: string })[];
  lists: PageDataList[];
  actions: PageDataAction[]; // screen-level actions available right now
}

/** What a screen passes in: the same shape, without the page key (the hook knows it). */
export type PageDataInput = Omit<PageData, 'page'>;

const ACTION_ID = /^[a-zA-Z][a-zA-Z0-9]*$/;

const published = new Map<string, () => PageData>();

const allActions = (d: PageData): PageDataAction[] => [d.actions, ...d.lists.flatMap((l) => l.items.map((i) => i.actions ?? []))].flat();

/** The key only exists when there is something to press, so the agent never tries a key that does nothing. */
const withKeys = (page: string, actions?: PageDataAction[]): PageDataAction[] | undefined =>
  actions?.map((a) => (a.run ? { ...a, key: `${page}.${a.id}` } : { ...a, key: undefined }));

function shape(page: string, data: PageDataInput): PageData {
  return {
    page,
    ...data,
    lists: data.lists.map((l) => ({ ...l, items: l.items.map((i) => ({ ...i, actions: withKeys(page, i.actions) })) })),
    actions: withKeys(page, data.actions) ?? [],
  };
}

/**
 * Publish what a screen shows and make its actions pressable. Returns the function that takes it all
 * away again; the hook calls that when the screen unmounts.
 *
 * Pass null while the screen is still loading: then nothing is published and `read` has no data, which
 * is what the agent should report - an empty list would be a lie the moment before it fills.
 */
export function publishPageData(page: string, data: PageDataInput | null): () => void {
  if (!data) return () => undefined;
  const full = shape(page, data);
  for (const a of allActions(full)) {
    if (!ACTION_ID.test(a.id)) throw new Error(`page "${page}": action id "${a.id}" must be letters and digits only`);
  }
  const get = () => full;
  published.set(page, get);
  const stops: (() => void)[] = [];
  for (const a of allActions(full)) {
    if (!a.run) continue;
    stops.push(
      registerControl({
        key: `${page}.${a.id}`,
        page,
        id: a.id,
        kind: 'action',
        label: a.label,
        agent: a.agent ?? 'free',
        run: () => Promise.resolve(a.run?.()),
      })
    );
  }
  return () => {
    if (published.get(page) === get) published.delete(page);
    for (const s of stops) s();
  };
}

/** What the open page is showing, or null when it published nothing (not open, or still loading). */
export const pageDataOf = (page: string): PageData | null => published.get(page)?.() ?? null;

/**
 * Publish what this screen shows for as long as it is on it. Re-published after every render, because
 * the labels and the buttons change as data arrives (a "Join" button becomes "Going"), and taken away
 * when the screen unmounts, so the agent never reads a screen that has gone.
 */
export function usePageData(page: { key: string }, data: PageDataInput | null): void {
  const ref = useRef(data);
  // No dependency list on purpose: the publication has to be rebuilt every render to stay true.
  useEffect(() => {
    ref.current = data; // kept fresh after every commit
    publishPageData(page.key, ref.current);
  });
}
