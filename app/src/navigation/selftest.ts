// Plain-Node self-test of the tree, the agent tools, the page controls, the glow, the policies and the words of every page.
// Run from bricks/app:  npx tsx src/navigation/selftest.ts
import '../features';
import { createAgentTools } from '../agent/tools';
import { registerControl } from '../agent/pageControls';
import { languagesMissing, t } from '../i18n/tables';
import { languageStore } from '../i18n/store';
import { definePage } from '../kit/page';
import { glowStore } from '../kit/glow';
import { answerSurface, LIMITS, parseShow, surfaceStore } from '../agent/surface';
import { toolSpecs } from '../agent/tools';
import { sessionStore } from '../session/store';
import { allModules, allPages, defineModule, pageForPath, search, tabPages } from './registry';
import { resolvePage } from './resolve';
import { childrenOf, describe, parsePath } from './tree';

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + detail}`);
  if (!ok) failed++;
};
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
const signedOut = { isAuthenticated: false };

// the tree
check('six modules', allModules().length === 6, String(allModules().length));
check('two tabs: Connect and Grow', tabPages().map((p) => p.key).join(',') === 'connect.index,grow.index', tabPages().map((p) => p.key).join(','));
check('profile is opened from the avatar, not a tab', !tabPages().some((p) => p.key === 'me.index') && pageForPath('/me')?.key === 'me.index');
check('root lists modules', !!childrenOf('')?.some((n) => n.path === 'auth' && n.kind === 'module'));
check('module lists pages and skills', (() => { const k = childrenOf('auth') ?? []; return k.some((n) => n.path === 'auth.signIn' && n.kind === 'page') && k.some((n) => n.path === 'auth/signOut' && n.kind === 'skill'); })());
check('page lists elements', (childrenOf('me.edit') ?? []).map((n) => n.path).join(',') === 'me.edit.heading,me.edit.displayName,me.edit.ageBand,me.edit.phone,me.edit.area,me.edit.save', (childrenOf('me.edit') ?? []).map((n) => n.path).join(','));
check('element parses', parsePath('me.edit.displayName')?.level === 'element');
check('unknown path is null', childrenOf('me.nope') === null && childrenOf('nope') === null);
check('describe element', (describe('me.edit.displayName') ?? '').includes('required') && (describe('me.edit') ?? '').includes('me.edit.save'));
check('describe has no code or routes', !(describe('me.edit') ?? '').includes('/profile/edit'));
check('where am I from path', pageForPath('/me')?.key === 'me.index' && pageForPath('/')?.key === 'connect.index' && pageForPath('/grow')?.key === 'grow.index' && pageForPath('/profile/edit')?.key === 'me.edit' && pageForPath('/sign-in')?.key === 'auth.signIn');
check('private pages need sign-in', (() => { const d = resolvePage('me.edit', {}, signedOut); return !d.ok && d.reason === 'denied'; })());
check('sign-in pages open without sign-in', resolvePage('auth.signIn', {}, signedOut).ok && resolvePage('language.pick', {}, signedOut).ok);
check('sign-in pages have no bottom bar', allPages().filter((p) => p.module === 'auth').every((p) => p.bare));
check('verify code is person-only and secret', (() => { const e = allPages().find((p) => p.key === 'auth.verify')?.elements.code; return e?.agent === 'human' && e?.secret === true; })());
check('Google, Singpass, DigiLocker are person-only', ['google', 'singpass', 'digilocker'].every((id) => allPages().find((p) => p.key === 'auth.signIn')?.elements[id]?.agent === 'human'));
check('no sample data in the app', !allPages().some((p) => Object.values(p.strings.en ?? {}).some((w) => /Ankit|Yoga|Rainwater|Sample/i.test(w))));
check('search sign in', search('sign in').some((h) => h.path === 'auth.signIn'));
check('search edit profile', search('edit profile').some((h) => h.path === 'me.edit'));
check('search change language', search('change language').some((h) => h.path === 'language/set'));

// the words of every page, in every language
const gaps: string[] = [];
for (const p of allPages()) {
  if (p.module === 'dev') continue; // developer page is English only on purpose
  for (const id of Object.keys(p.strings.en ?? {})) for (const l of languagesMissing(`${p.key}.${id}`)) gaps.push(`${p.key}.${id}:${l}`);
}
const commonIds = ['members', 'onlyYou', 'agentFilling', 'agentPressing', 'agentOpening', 'agent.tool.lookup', 'agent.tool.screen', 'agent.tool.show', 'agent.canvas.badge', 'agent.canvas.info', 'agent.canvas.about', 'agent.canvas.again', 'agent.canvas.next', 'comingSoon', 'comingSoonBody', 'ageBand.under40', 'ageBand.40to59', 'ageBand.60plus', 'notSet', 'saved', 'loading', 'error.invalidEmail', 'error.required', 'error.rateLimited', 'error.network', 'error.codeInvalid', 'error.tooManyAttempts', 'error.generic', 'error.emailFailed', 'error.emailBusy', 'agent.close', 'agent.type'];
for (const id of commonIds) for (const l of languagesMissing(`common.${id}`)) gaps.push(`common.${id}:${l}`);
check('every word exists in all six languages', gaps.length === 0, gaps.slice(0, 8).join(', '));

// definePage refuses mistakes
check('bad key refused', throws(() => definePage({ key: 'bad', module: 'bad', route: '/x', summary: '', elements: {}, strings: { en: {} } })));
check('missing English words refused', throws(() => definePage({ key: 'zz.a', module: 'zz', route: '/a', summary: '', elements: { name: { kind: 'field' } }, strings: { en: {} } })));

// a test module with policy tiers
const secret: string[] = [];
const testPage = definePage({
  key: 'zz.test', module: 'zz', route: '/zz', summary: 'Test page.',
  elements: {
    heading: { kind: 'text' },
    pin: { kind: 'field', type: 'string', secret: true },
    danger: { kind: 'action', agent: 'confirm' },
    forbidden: { kind: 'action', agent: 'human' },
  },
  strings: { en: { heading: 'Test', pin: 'PIN', danger: 'Danger', forbidden: 'Forbidden' } },
});
defineModule({ id: 'zz', title: 'Test', summary: 'Test module', keywords: [], pages: [testPage], skills: [] });
let dangerRan = 0;
registerControl({ key: 'zz.test.pin', page: 'zz.test', id: 'pin', kind: 'field', label: 'PIN', get: () => '1234', set: (v) => secret.push(String(v)) });
registerControl({ key: 'zz.test.danger', page: 'zz.test', id: 'danger', kind: 'action', label: 'Danger', run: () => { dangerRan++; } });
registerControl({ key: 'zz.test.forbidden', page: 'zz.test', id: 'forbidden', kind: 'action', label: 'Forbidden', run: () => { dangerRan += 100; } });

// the profile form, simulated (the screen registers these for real)
const form: Record<string, string> = { displayName: '', phone: '', area: '' };
let saved = 0;
for (const id of Object.keys(form)) registerControl({ key: `me.edit.${id}`, page: 'me.edit', id, kind: 'field', label: id, type: 'string', get: () => form[id], set: (v) => { form[id] = String(v); } });
registerControl({ key: 'me.edit.save', page: 'me.edit', id: 'save', kind: 'action', label: 'Save', run: () => { if (form.displayName.trim()) saved++; } });
registerControl({ key: 'language.pick.language', page: 'language.pick', id: 'language', kind: 'field', label: 'Language', options: ['en', 'hi', 'bn', 'ta', 'zh', 'ms'], get: () => languageStore.get().code, set: (v) => { languageStore.set({ code: v as 'en', ready: true }); } });

let current: string | undefined = 'connect.index';
let approve = false;
const agent = createAgentTools({
  currentPage: () => current,
  open: (key) => { const d = resolvePage(key); if (d.ok) current = key; return d; },
  confirm: async () => approve,
  pace: 0,
});

(async () => {
  const tree = (await agent.call('tree', {})) as { children: { path: string }[] };
  check('tool tree: modules', tree.children.some((c) => c.path === 'me'));
  check('tool tree: unknown path', 'error' in ((await agent.call('tree', { path: 'x.y' })) as object));
  check('tool docs', 'doc' in ((await agent.call('docs', { path: 'me' })) as object));
  check('tool open a page', ((await agent.call('open', { path: 'me.index' })) as { opened?: string }).opened === 'me.index');
  check('tool open refuses a module', 'error' in ((await agent.call('open', { path: 'me' })) as object));

  // fill opens the page first, then glows, then fills
  current = 'connect.index';
  const f = (await agent.call('fill', { path: 'me.edit.displayName', value: 'Test Person' })) as { ok?: boolean };
  check('fill opens the page and fills the field', f.ok === true && current === 'me.edit' && form.displayName === 'Test Person', JSON.stringify(f));
  check('the element glows while the agent acts', glowStore.get().key === 'me.edit.displayName' && glowStore.get().caption.length > 0, JSON.stringify(glowStore.get()));
  const pr = (await agent.call('press', { path: 'me.edit.save' })) as { ok?: boolean };
  check('press saves the profile', pr.ok === true && saved === 1);
  check('fill on a button is refused', 'error' in ((await agent.call('fill', { path: 'me.edit.save', value: 'x' })) as object));
  check('press on a field is refused', 'error' in ((await agent.call('press', { path: 'me.edit.displayName' })) as object));
  check('fill on an unknown element', 'error' in ((await agent.call('fill', { path: 'me.edit.nope', value: 'x' })) as object));

  // read
  current = 'me.edit';
  const read = (await agent.call('read', {})) as { elements: { path: string; value?: unknown }[] };
  check('read lists elements with values', read.elements.some((e) => e.path === 'me.edit.displayName' && e.value === 'Test Person'));

  // policy tiers per element
  const fh = (await agent.call('press', { path: 'zz.test.forbidden' })) as { refused?: string };
  check('person-only element refused', fh.refused === 'person_only' && dangerRan === 0);
  const d1 = (await agent.call('press', { path: 'zz.test.danger' })) as { status?: string };
  check('approval element waits', d1.status === 'awaiting_approval' && dangerRan === 0);
  approve = true;
  await agent.call('press', { path: 'zz.test.danger' });
  check('approval element runs after approval', dangerRan === 1);
  approve = false;
  current = 'zz.test';
  const sec = (await agent.call('read', {})) as { elements: { path: string; value?: unknown }[] };
  check('secret value is never shown to the agent', sec.elements.find((e) => e.path === 'zz.test.pin')?.value === undefined);
  await agent.call('fill', { path: 'zz.test.pin', value: '9999' });
  check('secret field can still be filled', secret.includes('9999'));

  // skills
  const none = (await agent.call('run', { skill: 'me/summary', input: {} })) as { ok?: boolean };
  check('run: me/summary with nobody signed in', none.ok === false && sessionStore.get().user === null);
  const w = (await agent.call('run', { skill: 'auth/signOut', input: {} })) as { status?: string };
  check('run: sign out waits for approval', w.status === 'awaiting_approval');

  // language (nobody is signed in, so it only changes this device)
  check('english default', t('connect.index.tab') === 'Connect' && t('grow.index.tab') === 'Grow');
  await agent.call('run', { skill: 'language/set', input: { code: 'hi' } });
  check('language/set hi', t('connect.index.tab') === 'जुड़ें' && t('common.comingSoon') === 'जल्द आ रहा है');
  const bad = (await agent.call('fill', { path: 'language.pick.language', value: 'xx' })) as { ok?: boolean };
  check('choice refuses a value that is not an option', bad.ok === false);
  await agent.call('fill', { path: 'language.pick.language', value: 'ta' });
  check('choice fill by key changes the language', t('connect.index.tab') === 'இணை');

  // the agent canvas: what the model sends is validated before anything can be shown
  const showSpec = toolSpecs.find((s) => s.name === 'show');
  check('canvas: show accepts tiles, question, hint, step and next', !!showSpec && ['tiles', 'question', 'hint', 'step', 'step_count', 'next'].every((k) => k in (showSpec.inputSchema.properties as Record<string, unknown>)));
  const spec = parseShow({
    title: '  A title  ', message: ' Hello ', question: 'Pick one', hint: '  A hint ', steps: [' one ', '', 'two'], options: ['Yes', 'No'],
    tiles: [{ id: 'a', label: 'Health', icon: 'heart' }, { id: 'a', label: 'Sports', icon: 'not an icon' }, { label: 'Other' }, 7],
    step: 2, step_count: 4, next: true, evil: '<script>alert(1)</script>',
  });
  check('canvas: strings are trimmed, lists capped, unknown fields dropped', spec?.title === 'A title' && spec?.message === 'Hello' && spec?.hint === 'A hint' && spec?.steps.join(',') === 'one,two' && spec?.options.length === 2 && !('evil' in (spec ?? {})), JSON.stringify(spec));
  check('canvas: tiles get a unique id and a checked icon', spec?.tiles.map((x) => x.id).join(',') === 'a,a_2,t3' && spec?.tiles.map((x) => x.label).join(',') === 'Health,Sports,Other' && spec?.tiles[0].icon === 'heart' && spec?.tiles[1].icon === '' && spec?.tiles[2].icon === '' && spec?.tiles.length === 3, JSON.stringify(spec?.tiles));
  check('canvas: step dots are clamped to the count', spec?.step === 2 && spec?.step_count === 4, JSON.stringify([spec?.step, spec?.step_count]));
  const wrong = parseShow({ title: 12, message: null, steps: 'not a list', options: 5, tiles: 'x', step: 'many', step_count: -3, next: 'true' });
  check('canvas: a wrong type falls back instead of blanking the screen', wrong?.title === '' && wrong?.message === '' && wrong?.steps.length === 0 && wrong?.options.length === 0 && wrong?.tiles.length === 0 && wrong?.step === 0 && wrong?.step_count === 0 && wrong?.next === true, JSON.stringify(wrong));
  const nothing = (await agent.call('show', { evil: true })) as object;
  check('canvas: a show with nothing to show is refused', 'error' in nothing, JSON.stringify(nothing));
  const shown = agent.call('show', { title: 'T', question: 'Q', step_count: 4, step: 2, tiles: [{ id: 'x', label: 'One', icon: 'heart' }] }) as Promise<Record<string, unknown>>;
  const s = surfaceStore.get().surface;
  check('canvas: a tile question opens and waits', surfaceStore.get().open === true && s?.title === 'T' && s?.tiles.length === 1 && s?.stepTotal === 4 && s?.step === 2, JSON.stringify(surfaceStore.get()));
  answerSurface('One', 'option');
  const answered = await shown;
  check('canvas: the answer is the labels the person chose', answered.answer === 'One' && answered.how === 'option', JSON.stringify(answered));
  check('canvas: answering closes the panel', surfaceStore.get().open === false);
  check('canvas: the limits are small enough to fit a phone', LIMITS.tiles <= 12 && LIMITS.stepCount <= 10 && LIMITS.title <= 120 && LIMITS.html <= 20000);
  // the server copies each description into the Gemini declaration and cuts it at 1000 characters (declarations.py): a longer one loses its tail in silence
  check('every tool description fits the server limit of 1000 characters', toolSpecs.every((s) => s.description.length <= 1000), toolSpecs.filter((s) => s.description.length > 1000).map((s) => `${s.name}:${s.description.length}`).join(', '));

  console.log(failed ? `\n${failed} FAILED` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
