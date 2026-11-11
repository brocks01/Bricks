import type { ElementDef, PageDef } from '../navigation/types';

const PAGE_KEY = /^[a-z][a-z0-9]*\.[a-zA-Z][a-zA-Z0-9]*$/; // '<module>.<name>'
const ELEMENT_ID = /^[a-zA-Z][a-zA-Z0-9]*$/; // no dots: dots separate the levels of the tree

/**
 * Declare a page. Plain data in, the same data out, checked at start-up so a mistake fails at once:
 * a bad key, a module that does not match, a route without a slash, an element without its English words.
 */
export function definePage<const E extends Record<string, ElementDef>>(def: Omit<PageDef, 'elements'> & { elements: E }): PageDef & { elements: E } {
  if (!PAGE_KEY.test(def.key)) throw new Error(`page "${def.key}": the key must look like "module.name"`);
  if (def.key.split('.')[0] !== def.module) throw new Error(`page "${def.key}": the key must start with its module "${def.module}"`);
  if (!def.route.startsWith('/')) throw new Error(`page "${def.key}": the route must start with "/"`);
  const en = def.strings.en ?? {};
  for (const [id, el] of Object.entries(def.elements)) {
    if (!ELEMENT_ID.test(id)) throw new Error(`page "${def.key}": element id "${id}" must be letters and digits only`);
    if (el.kind === 'choice' && !el.options?.length) throw new Error(`page "${def.key}": choice "${id}" needs options`);
    if (el.kind !== 'list' && !en[id]) throw new Error(`page "${def.key}": element "${id}" has no English words`);
  }
  if (def.tab !== undefined && !en.tab && !en.heading) throw new Error(`page "${def.key}": a tab page needs a "tab" or "heading" word`);
  return def as PageDef & { elements: E };
}

/** The full key of an element, for example elementKey(page, 'title') gives 'events.new.title'. */
export const elementKey = (page: { key: string }, id: string): string => `${page.key}.${id}`;
