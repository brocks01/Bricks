// Plain-Node self-test of the tree, the agent tools, the page controls, the glow, the policies and the words of every page.
// Run from bricks/app:  npx tsx src/navigation/selftest.ts
import '../features';
import { createAgentTools } from '../agent/tools';
import { registerControl } from '../agent/pageControls';
import { languagesMissing, t } from '../i18n/tables';
import { languageStore } from '../i18n/store';
import { definePage } from '../kit/page';
import { glowStore } from '../kit/glow';
import { answerSurface, LIMITS, surfaceStore } from '../agent/surface';
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
check('eight modules', allModules().length === 8, String(allModules().length));
check('five tabs in order', tabPages().map((p) => p.key).join(',') === 'home.index,community.index,events.index,goals.index,me.index', tabPages().map((p) => p.key).join(','));
check('root lists modules', !!childrenOf('')?.some((n) => n.path === 'auth' && n.kind === 'module'));
check('module lists pages and skills', (() => { const k = childrenOf('auth') ?? []; return k.some((n) => n.path === 'auth.signIn' && n.kind === 'page') && k.some((n) => n.path === 'auth/signOut' && n.kind === 'skill'); })());
check('page lists elements', (childrenOf('me.edit') ?? []).map((n) => n.path).join(',') === 'me.edit.heading,me.edit.displayName,me.edit.ageBand,me.edit.phone,me.edit.area,me.edit.save', (childrenOf('me.edit') ?? []).map((n) => n.path).join(','));
check('element parses', parsePath('me.edit.displayName')?.level === 'element');
check('unknown path is null', childrenOf('me.nope') === null && childrenOf('nope') === null);
check('describe element', (describe('me.edit.displayName') ?? '').includes('required') && (describe('me.edit') ?? '').includes('me.edit.save'));
check('describe has no code or routes', !(describe('me.edit') ?? '').includes('/profile/edit'));
check('where am I from path', pageForPath('/me')?.key === 'me.index' && pageForPath('/')?.key === 'home.index' && pageForPath('/profile/edit')?.key === 'me.edit' && pageForPath('/sign-in')?.key === 'auth.signIn');
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
const commonIds = ['members', 'onlyYou', 'agentFilling', 'agentPressing', 'agentOpening', 'comingSoon', 'comingSoonBody', 'ageBand.under40', 'ageBand.40to59', 'ageBand.60plus', 'notSet', 'saved', 'loading', 'error.invalidEmail', 'error.required', 'error.rateLimited', 'error.network', 'error.codeInvalid', 'error.tooManyAttempts', 'error.generic', 'error.emailFailed', 'error.emailBusy', 'agent.close', 'agent.type'];
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

let current: string | undefined = 'home.index';
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
  current = 'home.index';
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
  check('english default', t('me.index.tab') === 'Me' && t('home.index.tab') === 'Home');
  await agent.call('run', { skill: 'language/set', input: { code: 'hi' } });
  check('language/set hi', t('home.index.tab') === 'होम' && t('common.comingSoon') === 'जल्द आ रहा है');
  const bad = (await agent.call('fill', { path: 'language.pick.language', value: 'xx' })) as { ok?: boolean };
  check('choice refuses a value that is not an option', bad.ok === false);
  await agent.call('fill', { path: 'language.pick.language', value: 'ta' });
  check('choice fill by key changes the language', t('home.index.tab') === 'முகப்பு');

  console.log(failed ? `\n${failed} FAILED` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
