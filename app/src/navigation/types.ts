// Shapes for the module > page > element tree. Plain data: no React, no router. The app, the agent and the tests all read these.
import type { LangCode } from '../i18n/languages';

/** Who caused a move or an action. Stamped on every event so we can always say what the agent did. */
export type Origin = 'human' | 'agent' | 'notification' | 'tour';

export type FieldType = 'string' | 'number' | 'boolean';

/** What a thing on a page is. */
export type ElementKind = 'text' | 'field' | 'choice' | 'action' | 'list';

/** Who may use an element: the agent freely, only after the person approves, or never (the agent guides instead). */
export type AgentPolicy = 'free' | 'confirm' | 'human';

/** Words for one page, by language, by word id. Full keys are made as `${page.key}.${id}`. */
export type PageStrings = Partial<Record<LangCode, Record<string, string>>>;

export interface FieldSpec {
  name: string;
  type: FieldType;
  required?: boolean;
  description?: string;
  enum?: string[];
}

/** One thing on a page. Its full key is `${page.key}.${id}`, for example `events.new.title`. */
export interface ElementDef {
  kind: ElementKind;
  type?: FieldType; // for field and choice
  required?: boolean;
  options?: string[]; // for choice: the allowed values
  agent?: AgentPolicy; // default 'free'
  secret?: boolean; // the value is never given back to the agent
  summary?: string; // one plain sentence for the agent (English)
}

/**
 * THE declaration of one page. Plain data. Everything about the page is here:
 * where it lives, what is on it, who may open it, and its words. Navigation, translations,
 * forms, the agent and the generated docs all read this one object.
 */
export interface PageDef {
  key: string; // '<module>.<name>', for example 'events.new'
  module: string;
  route: string; // router path, with [param] placeholders
  summary: string; // one plain sentence the agent can read
  params?: string[];
  requiresAuth?: boolean;
  tab?: number; // position in the bottom bar (1 to 5)
  icon?: string; // icon name for its tab, for example 'home' (the outline version is used when not selected)
  bare?: boolean; // no bottom bar on this page (sign-in pages)
  keywords?: string[];
  elements: Record<string, ElementDef>;
  strings: PageStrings;
}

export interface SkillContext {
  origin: Origin;
  navigate: (pageKey: string, params?: Record<string, string>) => { ok: boolean; reason?: string };
}

export interface SkillResult {
  ok: boolean;
  summary: string; // one plain sentence for the person and the agent
  data?: unknown;
}

/** Something a module can do as a whole (beyond filling one page): for example list events. */
export interface Skill {
  name: string;
  summary: string;
  input: FieldSpec[];
  confirm?: boolean; // the person must approve first
  by?: 'both' | 'human'; // 'human' = the agent must not do this
  keywords?: string[];
  run: (input: Record<string, unknown>, ctx: SkillContext) => Promise<SkillResult> | SkillResult;
}

/** A module: its pages and its skills, declared once. */
export interface AppModule {
  id: string; // no dots, for example 'events'
  title: string;
  summary: string;
  keywords: string[];
  pages: PageDef[];
  skills: Skill[];
}

export interface Guard {
  isAuthenticated: boolean;
}

export type Decision =
  | { ok: true; page: PageDef; path: string; params: Record<string, string> }
  | { ok: false; reason: 'unknown_page' | 'denied' | 'missing_params'; missing?: string[] };
