import { t } from '../i18n/tables';
import { glow } from '../kit/glow';
import { pageDataOf } from '../kit/pageData';
import { elementKey } from '../kit/page';
import { findSkill, getModule, search } from '../navigation/registry';
import { childrenOf, describe, parsePath } from '../navigation/tree';
import { note } from '../navigation/log';
import type { AgentPolicy, Decision, SkillResult } from '../navigation/types';
import { hideSurface, showSurface } from './surface';
import { agentSettings, controlsOfPage, fillElement, getControl, pressElement, waitForPage } from './pageControls';

/**
 * The agent's whole world: a few tools over ONE tree, walked a level at a time: modules > pages > elements.
 * It lists a level, searches, reads one node's description, then opens, fills, presses or runs.
 * It never receives the whole app at once, and never sees code, file names or addresses.
 * Tools are plain JSON-schema specs, so any model with function calling (for example Gemini Live) can use them.
 */
export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AgentHost {
  currentPage: () => string | undefined;
  open: (pageKey: string, params?: Record<string, string>) => Decision;
  /** Ask the person to approve. Resolves true if approved. */
  confirm: (title: string, input: Record<string, unknown>) => Promise<boolean>;
  /** Milliseconds to show the glow before acting, so the person can follow. Default 450. */
  pace?: number;
}

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false });
export const toolSpecs: ToolSpec[] = [
  { name: 'tree', description: 'List one level of the app tree. No path lists the modules. A module id (for example "events") lists its pages and skills. A page key ("events.new") lists its elements.', inputSchema: obj({ path: { type: 'string' } }) },
  { name: 'search', description: 'Search every level by plain words, for example "create event" or "change language". Returns paths to use next.', inputSchema: obj({ query: { type: 'string' } }, ['query']) },
  { name: 'docs', description: 'Read the description of one node: a module, a page or an element, with its inputs and who may use it.', inputSchema: obj({ path: { type: 'string' } }, ['path']) },
  { name: 'open', description: 'Open a page by its key (or the page that holds an element).', inputSchema: obj({ path: { type: 'string' }, data: { type: 'object' } }, ['path']) },
  { name: 'read', description: 'Read the page that is open now: its elements with current values, plus its data - the text, pictures, lists and actions the screen is actually showing. Describe the screen from that data only; if there is no data, say you cannot see what is on it.', inputSchema: obj({}) },
  { name: 'fill', description: 'Fill a field by its element key, for example "events.new.title". Opens its page first if needed. The person sees it glow.', inputSchema: obj({ path: { type: 'string' }, value: {} }, ['path', 'value']) },
  { name: 'press', description: 'Press a button by its element key, for example "events.new.create". Opens its page first if needed.', inputSchema: obj({ path: { type: 'string' } }, ['path']) },
  {
    name: 'show',
    description:
      'Show something in a panel that fills the content area: a question with choices or tiles, numbered steps, or a small screen you wrote (a calculation, table, checklist or lesson). Write ALL text in the person\'s language, plain and large. Always give a title and a message; html is optional extra (headings, lists, tables, cards, inline SVG, no scripts, no links, under 20000 characters) and you do the arithmetic and show the result. Display order: question, tiles, options, typed-answer box, hint, steps, html. tiles are up to 12, each {id, label, icon}, icon an Ionicons name such as "heart", "walk", "calculator"; the person taps them and Next returns the labels they chose. step and step_count light up to 10 step dots; next shows a Next button. With options, allow_text, tiles or next it WAITS and returns their answer; otherwise it returns at once and stays open until they close it or you call hide. Never show a panel that repeats the open screen: act on the app instead, or call hide.',
    inputSchema: obj(
      {
        title: { type: 'string', description: 'The heading of the panel, short.' },
        message: { type: 'string', description: 'One or two plain sentences under the heading.' },
        question: { type: 'string', description: 'The bold question above the choices.' },
        hint: { type: 'string', description: 'A short helpful note shown in a card.' },
        steps: { type: 'array', items: { type: 'string' }, description: 'Up to 8 short numbered steps.' },
        html: { type: 'string' },
        options: { type: 'array', items: { type: 'string' }, description: 'Up to 6 short choices; the person taps one.' },
        allow_text: { type: 'boolean', description: 'Let the person type an answer.' },
        tiles: {
          type: 'array',
          description: 'Up to 12 selectable tiles in a grid. The person taps them and Next returns the labels they chose.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'A short unique id, letters, digits, "-" or "_", up to 40 characters.' },
              label: { type: 'string', description: 'What the person reads, in their language, up to 40 characters.' },
              icon: { type: 'string', description: 'An Ionicons name, for example "heart", "people", "trophy", "walk", "leaf", "calculator".' },
            },
            required: ['label'],
            additionalProperties: false,
          },
        },
        step: { type: 'number', description: 'Which step dot is lit, counting from 1.' },
        step_count: { type: 'number', description: 'How many step dots to show, up to 10. 0 for none.' },
        next: { type: 'boolean', description: 'Show a Next button that waits for the person.' },
      },
      []
    ),
  },
  { name: 'hide', description: 'Close the panel you opened with show.', inputSchema: obj({}) },
  { name: 'run', description: 'Run a module skill by "module/skill", for example "events/create". Some skills need the person to approve.', inputSchema: obj({ skill: { type: 'string' }, input: { type: 'object' } }, ['skill']) },
];

export function createAgentTools(host: AgentHost) {
  const pace = host.pace ?? agentSettings.pace;
  agentSettings.pace = pace;

  async function allowed(policy: AgentPolicy | undefined, title: string, input: Record<string, unknown>): Promise<null | Record<string, unknown>> {
    if (policy === 'human') return { ok: false, refused: 'person_only', hint: 'The agent must not do this. Open the page and guide the person.' };
    if (policy === 'confirm') {
      const ok = await host.confirm(title, input);
      if (!ok) return { status: 'awaiting_approval', note: 'The person was asked. Report the pause; do not retry.' };
    }
    return null;
  }

  async function ensureOpen(pageKey: string): Promise<Decision | null> {
    if (host.currentPage() === pageKey) return null;
    const d = host.open(pageKey);
    if (!d.ok) return d;
    glow(pageKey, t('common.agentOpening', { label: t(`${pageKey}.${d.page.tab ? 'tab' : 'heading'}`) }), pace + 600);
    await waitForPage(pageKey);
    return null;
  }

  async function call(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    switch (name) {
      case 'tree': {
        const path = String(args.path ?? '');
        const kids = childrenOf(path);
        if (!kids) return { error: 'unknown_path', hint: 'Call tree with no path to see the modules.' };
        return { path: path || '(root)', children: kids, next: path.split('.').filter(Boolean).length === 0 ? 'Call tree with a module id, or search.' : 'Call docs for details, then open, fill, press or run.' };
      }

      case 'search':
        return { results: search(String(args.query ?? '')).map(({ kind, path, summary }) => ({ kind, path, summary })) };

      case 'docs': {
        const text = describe(String(args.path ?? ''));
        return text ? { path: args.path, doc: text } : { error: 'unknown_path' };
      }

      case 'open': {
        const p = parsePath(String(args.path ?? ''));
        if (!p || p.level === 'root' || p.level === 'module') return { error: 'not_a_page', hint: 'Give a page key like "events.new". Use tree to list pages.' };
        const d = host.open(p.page.key, (args.data ?? {}) as Record<string, string>);
        if (d.ok) return { opened: d.page.key, summary: d.page.summary };
        if (d.reason === 'missing_params') return { error: 'missing_params', missing: d.missing };
        return d.reason === 'unknown_page' ? { error: 'unknown_page' } : { denied: true, note: 'The person may not open this page.' };
      }

      case 'read': {
        const pageKey = host.currentPage();
        if (!pageKey) return { error: 'unknown_page' };
        const p = parsePath(pageKey);
        if (!p || p.level !== 'page') return { error: 'unknown_page' };
        await waitForPage(pageKey, 800);
        const live = new Map(controlsOfPage(pageKey).map((c) => [c.id, c]));
        // `data` is what the screen published about itself (usePageData). Absent means the screen has not
        // published anything - still loading, or gone - and that is exactly what the agent must say.
        const data = pageDataOf(pageKey);
        return {
          page: pageKey,
          elements: Object.entries(p.page.elements).map(([id, el]) => {
            const c = live.get(id);
            return { path: `${pageKey}.${id}`, kind: el.kind, label: t(`${pageKey}.${id}`), required: !!el.required, agent: el.agent ?? 'free', value: el.secret ? undefined : c?.get?.() };
          }),
          ...(data ? { data } : {}),
        };
      }

      case 'fill':
      case 'press': {
        const path = String(args.path ?? '');
        const p = parsePath(path);
        const el = p && p.level === 'element' ? p : null;
        // A listed item's action ("open community X") is not in page.ts - the screen publishes it with
        // usePageData - so it resolves from the controls the open screen registered. Everything else is
        // unchanged: the page declaration still decides what exists and who may use it.
        const listed = el ? undefined : getControl(path);
        if (!el && !listed) return { error: 'not_an_element', hint: 'Give an element key like "events.new.title". Use tree on a page to list its elements, or read to see what the open screen is showing.' };
        const kind = el ? el.element.kind : (listed as NonNullable<typeof listed>).kind;
        const wanted = name === 'fill' ? ['field', 'choice'] : ['action'];
        if (!wanted.includes(kind)) return { error: 'wrong_kind', hint: `${path} is a ${kind}; use ${kind === 'action' ? 'press' : 'fill'}.` };
        const policy = (el ? el.element.agent : listed!.agent) ?? 'free';
        // The approval title is for the person: a plain label in their language, never the element key.
        const blocked = await allowed(policy, el ? t(path) : listed!.label, { value: args.value });
        if (blocked) return blocked;
        const refused = await ensureOpen(el ? el.page.key : listed!.page);
        if (refused) return { error: 'could_not_open_page' };
        // The glow and the pause happen inside fillElement / pressElement, so skills glow exactly the same way.
        const result = name === 'fill' ? await fillElement(path, args.value) : await pressElement(path);
        return { ...result, path };
      }

      case 'show':
        return showSurface(args);

      case 'hide':
        hideSurface();
        return { hidden: true };

      case 'run': {
        const [moduleId, skillName] = String(args.skill ?? '').split('/');
        const skill = findSkill(moduleId, skillName);
        if (!skill) return { error: 'unknown_skill', available: getModule(moduleId)?.skills.map((s) => `${moduleId}/${s.name}`) ?? 'unknown_module' };
        const id = `${moduleId}/${skillName}`;
        const input = (args.input ?? {}) as Record<string, unknown>;
        const missing = skill.input.filter((f) => f.required && (input[f.name] === undefined || input[f.name] === '')).map((f) => f.name);
        if (missing.length) return { error: 'missing_input', missing, expected: skill.input.map((f) => f.name) };
        const blocked = await allowed(skill.by === 'human' ? 'human' : skill.confirm ? 'confirm' : 'free', skill.summary, input);
        if (blocked) return { ...blocked, action: id };
        let result: SkillResult;
        try {
          result = await skill.run(input, { origin: 'agent', navigate: (k, p) => { const d = host.open(k, p); return d.ok ? { ok: true } : { ok: false, reason: d.reason }; } });
        } catch (e) {
          result = { ok: false, summary: `The skill failed: ${(e as Error).message}` };
        }
        note({ type: 'skill', id, origin: 'agent', ok: result.ok });
        return { ...result, action: id };
      }

      default:
        return { error: `unknown_tool:${name}` };
    }
  }

  return { tools: toolSpecs, call, elementKey, getControl };
}
