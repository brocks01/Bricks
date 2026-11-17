// Plain-Node self-test of the tree, the agent tools, the page controls, the glow, the policies and the words of every page.
// Run from bricks/app:  npx tsx src/navigation/selftest.ts
import '../features';
import { createAgentTools, toolSpecs } from '../agent/tools';
import { registerControl } from '../agent/pageControls';
import { languagesMissing, t } from '../i18n/tables';
import { languageStore } from '../i18n/store';
import { definePage } from '../kit/page';
import { glowStore } from '../kit/glow';
import { pageDataOf, publishPageData } from '../kit/pageData';
import { IDLE_MS } from '../agent/live';
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
check('eighteen modules', allModules().length === 18, String(allModules().length));
check('grow has six pages, each needs sign-in', allPages().filter((p) => p.module === 'grow').length === 6 && allPages().filter((p) => p.module === 'grow').every((p) => !!p.requiresAuth));
check('grow pages have a heading in all six languages', allPages().filter((p) => p.module === 'grow' && p.key !== 'grow.index').every((p) => Object.values(p.strings).length === 6 && Object.values(p.strings).every((w) => !!(w as Record<string, string>).heading)));
check('explore has five pages', allPages().filter((p) => p.module === 'explore').length === 5);
check('explore item page takes an id and needs sign-in', (() => { const p = allPages().find((x) => x.key === 'explore.item'); return !!p && p.route === '/explore/item/[id]' && !!p.requiresAuth && p.params?.[0] === 'id'; })());
check('grow home declares its six cards', ['health', 'activity', 'aspirations', 'explore', 'progress', 'contributions'].every((id) => !!allPages().find((x) => x.key === 'grow.index')?.elements[id]));
check('every explore category and format has words in all six languages', (() => { const ids = ['digital_skills', 'health_awareness', 'everyday_life', 'hobbies', 'culture', 'knowledge', 'guide', 'video', 'interactive', 'story', 'audio', 'activity', 'easy', 'medium']; const lines = ids.filter((i) => i.indexOf('_') > 0 && i !== 'digital_skills' || i === 'digital_skills').map((i) => i + '_line'); const st = allPages().find((x) => x.key === 'explore.home')!.strings; return Object.values(st).length === 6 && Object.values(st).every((words) => [...ids, ...lines.filter((l) => l in (st.en ?? {}))].every((k) => !!(words as Record<string, string>)[k])); })());
check('four tabs in order: Home, Communities, the Marketplace and Wisdom; Health is not a tab', tabPages().map((p) => p.key).join(',') === 'home.index,connect.index,market.index,wisdom.index', tabPages().map((p) => p.key).join(','));
// the paid sessions (services by the hour) moved from the Marketplace tab into Wisdom
check('wisdom has a Paid sessions part with its own pages', (() => {
  const idx = allPages().find((x) => x.key === 'wisdom.index');
  return !!idx && (idx.elements.section.options ?? []).includes('paid') && !!idx.elements.serviceSearch && !!idx.elements.serviceKind && !!idx.elements.myServices && !!idx.elements.offerService
    && ['wisdom.service', 'wisdom.serviceOffer', 'wisdom.myServices'].every((k) => allPages().find((x) => x.key === k)?.module === 'wisdom');
})());
check('the marketplace tab keeps only opportunities near the person', allPages().filter((p) => p.module === 'market').every((p) => ['market.index', 'market.more', 'market.day', 'market.stall'].includes(p.key)), allPages().filter((p) => p.module === 'market').map((p) => p.key).join(','));
check('the moved service pages open at their new addresses', pageForPath('/wisdom/service/abc')?.key === 'wisdom.service' && pageForPath('/wisdom/service-offer')?.key === 'wisdom.serviceOffer' && pageForPath('/wisdom/services')?.key === 'wisdom.myServices');
check('calendar has four pages, each needs sign-in', allPages().filter((p) => p.module === 'calendar').length === 4 && allPages().filter((p) => p.module === 'calendar').every((p) => !!p.requiresAuth));
check('the medicine form always carries the not-medical-advice note', !!allPages().find((x) => x.key === 'calendar.new')?.elements.notMedical);
check('the plan page takes an id and needs sign-in', (() => { const p = allPages().find((x) => x.key === 'calendar.item'); return !!p && p.route === '/calendar/item/[id]' && !!p.requiresAuth && p.params?.[0] === 'id'; })());
check('profile is opened from the avatar, not a tab', !tabPages().some((p) => p.key === 'me.index') && pageForPath('/me')?.key === 'me.index');
check('root lists modules', !!childrenOf('')?.some((n) => n.path === 'auth' && n.kind === 'module'));
check('module lists pages and skills', (() => { const k = childrenOf('auth') ?? []; return k.some((n) => n.path === 'auth.signIn' && n.kind === 'page') && k.some((n) => n.path === 'auth/signOut' && n.kind === 'skill'); })());
check('page lists elements', (childrenOf('me.field') ?? []).map((n) => n.path).join(',') === 'me.field.heading,me.field.answer,me.field.record,me.field.save', (childrenOf('me.field') ?? []).map((n) => n.path).join(','));
check('element parses', parsePath('me.index.quietFrom')?.level === 'element');
check('unknown path is null', childrenOf('me.nope') === null && childrenOf('nope') === null);
check('describe element', (describe('me.field.answer') ?? '').includes('comma list') && (describe('me.field') ?? '').includes('me.field.save'));
check('describe has no code or routes', !(describe('me.field') ?? '').includes('/profile/[field]'));
check('profile sign out asks first, and only Yes needs approval', (() => { const e = allPages().find((p) => p.key === 'me.index')?.elements; return e?.signOut?.agent === undefined && e?.signOutYes?.agent === 'confirm'; })());
check('where am I from path', pageForPath('/me')?.key === 'me.index' && pageForPath('/')?.key === 'onboarding.start' && pageForPath('/today')?.key === 'home.index' && pageForPath('/communities')?.key === 'connect.index' && pageForPath('/market')?.key === 'market.index' && pageForPath('/health')?.key === 'health.index' && pageForPath('/health-records')?.key === 'grow.health' && pageForPath('/grow')?.key === 'grow.index' && pageForPath('/profile/edit')?.key === 'me.edit' && pageForPath('/sign-in')?.key === 'auth.signIn');
check('private pages need sign-in', (() => { const d = resolvePage('me.edit', {}, signedOut); return !d.ok && d.reason === 'denied'; })());
check('sign-in pages open without sign-in', resolvePage('auth.signIn', {}, signedOut).ok && resolvePage('language.pick', {}, signedOut).ok);
check('sign-in pages have no bottom bar', allPages().filter((p) => p.module === 'auth').every((p) => p.bare));
check('sign-in code is person-only, mock Singpass is not', (() => { const e = allPages().find((p) => p.key === 'auth.signIn')?.elements; return e?.code?.agent === 'human' && e?.singpass?.kind === 'action' && e.singpass.agent !== 'human'; })());
check('no sample data in the app', !allPages().some((p) => Object.values(p.strings.en ?? {}).some((w) => /Ankit|Yoga (class|session|club)|Rainwater|Sample/i.test(w))));
check('search sign in', search('sign in').some((h) => h.path === 'auth.signIn'));
check('search edit profile', search('edit profile').some((h) => h.path === 'me.edit'));
check('search change language', search('change language').some((h) => h.path === 'language/set'));

// the words of every page, in every language
const gaps: string[] = [];
for (const p of allPages()) {
  if (p.module === 'dev') continue; // developer page is English only on purpose
  for (const id of Object.keys(p.strings.en ?? {})) for (const l of languagesMissing(`${p.key}.${id}`)) gaps.push(`${p.key}.${id}:${l}`);
}
const commonIds = ['members', 'onlyYou', 'agentFilling', 'agentPressing', 'agentOpening', 'agent.tool.lookup', 'agent.tool.screen', 'agent.tool.show', 'agent.canvas.badge', 'agent.canvas.info', 'agent.canvas.about', 'agent.canvas.again', 'agent.canvas.next', 'agent.approve.ask', 'agent.approve.yes', 'agent.approve.no', 'comingSoon', 'comingSoonBody', 'ageBand.under40', 'ageBand.40to59', 'ageBand.60plus', 'notSet', 'saved', 'loading', 'error.invalidEmail', 'error.required', 'error.rateLimited', 'error.network', 'error.codeInvalid', 'error.tooManyAttempts', 'error.generic', 'error.emailFailed', 'error.emailBusy', 'agent.close', 'agent.type'];
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

// the profile's quiet hours, simulated (the screen registers these for real)
const form: Record<string, string> = { quietFrom: '', quietTo: '' };
let saved = 0;
for (const id of Object.keys(form)) registerControl({ key: `me.index.${id}`, page: 'me.index', id, kind: 'field', label: id, type: 'string', get: () => form[id], set: (v) => { form[id] = String(v); } });
registerControl({ key: 'me.index.reachSave', page: 'me.index', id: 'reachSave', kind: 'action', label: 'Save', run: () => { if (form.quietFrom.trim()) saved++; } });
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
  const f = (await agent.call('fill', { path: 'me.index.quietFrom', value: '21:00' })) as { ok?: boolean };
  check('fill opens the page and fills the field', f.ok === true && current === 'me.index' && form.quietFrom === '21:00', JSON.stringify(f));
  check('the element glows while the agent acts', glowStore.get().key === 'me.index.quietFrom' && glowStore.get().caption.length > 0, JSON.stringify(glowStore.get()));
  const pr = (await agent.call('press', { path: 'me.index.reachSave' })) as { ok?: boolean };
  check('press saves the profile', pr.ok === true && saved === 1);
  check('fill on a button is refused', 'error' in ((await agent.call('fill', { path: 'me.index.reachSave', value: 'x' })) as object));
  check('press on a field is refused', 'error' in ((await agent.call('press', { path: 'me.index.quietFrom' })) as object));
  check('fill on an unknown element', 'error' in ((await agent.call('fill', { path: 'me.index.nope', value: 'x' })) as object));

  // read
  current = 'me.index';
  const read = (await agent.call('read', {})) as { elements: { path: string; value?: unknown }[] };
  check('read lists elements with values', read.elements.some((e) => e.path === 'me.index.quietFrom' && e.value === '21:00'));

  // what a screen publishes about itself (usePageData -> publishPageData), so read can describe it
  current = 'connect.index';
  const noData = (await agent.call('read', {})) as { data?: unknown };
  check('read has no data until a screen publishes some', !('data' in noData), JSON.stringify(noData.data));
  let opened = '';
  const stopData = publishPageData('connect.index', {
    values: [{ label: 'Find your community', value: 'bedok' }],
    images: [],
    lists: [
      {
        label: 'My communities',
        items: [
          { label: 'Bedok Heritage Kakis', detail: '128 members', actions: [{ id: 'community1', label: 'Bedok Heritage Kakis', run: () => { opened = 'Bedok Heritage Kakis'; } }] },
          { label: 'Toa Payoh Silver Mentors', detail: '340 members' },
        ],
      },
      { label: 'Coming up', items: [{ label: 'Tai Chi in the Park', detail: 'Tampines Kampung Spirit' }] },
    ],
    actions: [],
  });
  const screen = pageDataOf('connect.index');
  check('page data is published for its own page', screen?.page === 'connect.index' && screen?.values[0].value === 'bedok');
  check('a list keeps the labels that are on screen', screen?.lists[0].items.map((i) => i.label).join(',') === 'Bedok Heritage Kakis,Toa Payoh Silver Mentors', JSON.stringify(screen?.lists));
  check('a listed item keeps its short detail', screen?.lists[0].items[0].detail === '128 members');
  check('a listed action carries a pressable key', screen?.lists[0].items[0].actions?.[0].key === 'connect.index.community1' && screen?.lists[0].items[1].actions === undefined);
  const withData = (await agent.call('read', {})) as { data?: { lists: { items: { label: string }[] }[] }; elements: { path: string }[] };
  check('read returns the screen data alongside the elements', withData.data?.lists[0].items.length === 2 && withData.elements.length > 0, JSON.stringify(withData.data));
  const openIt = (await agent.call('press', { path: 'connect.index.community1' })) as { ok?: boolean };
  check('press runs a listed item action through the screen', openIt.ok === true && opened === 'Bedok Heritage Kakis', JSON.stringify(openIt));
  check('a listed action glows its own key', glowStore.get().key === 'connect.index.community1', JSON.stringify(glowStore.get()));
  const noRun = (await agent.call('press', { path: 'connect.index.community2' })) as object;
  check('a listed item with nothing to press is refused', 'error' in noRun, JSON.stringify(noRun));
  check('an action id that is not letters and digits is refused', throws(() => publishPageData('zz.test', { values: [], images: [], lists: [], actions: [{ id: 'not an id', label: 'x', run: () => undefined }] })));
  stopData();
  check('page data clears when the screen unmounts', pageDataOf('connect.index') === null);
  const gone = (await agent.call('read', {})) as { data?: unknown };
  check('read has no data once the screen has gone', !('data' in gone), JSON.stringify(gone.data));
  current = 'me.index';

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
  check('english default', t('connect.index.tab') === 'Communities' && t('home.index.tab') === 'Home' && t('market.index.tab') === 'Marketplace');
  await agent.call('run', { skill: 'language/set', input: { code: 'hi' } });
  check('language/set hi', t('connect.index.tab') === 'समुदाय' && t('common.comingSoon') === 'जल्द आ रहा है');
  const bad = (await agent.call('fill', { path: 'language.pick.language', value: 'xx' })) as { ok?: boolean };
  check('choice refuses a value that is not an option', bad.ok === false);
  await agent.call('fill', { path: 'language.pick.language', value: 'ta' });
  check('choice fill by key changes the language', t('connect.index.tab') === 'சமூகம்');

  check('the agent shows no screens: no show, hide, panel or build tool', ['show', 'hide', 'panel', 'build'].every((n) => !toolSpecs.some((x) => x.name === n)));
  // the talk ends by itself: the agent can hang up, and a quiet talk is cut rather than listening forever
  check('an end tool exists so the agent can hang up', !!toolSpecs.find((s) => s.name === 'end'));
  const ended = (await agent.call('end', {})) as { ended?: boolean };
  check('the end tool answers that the conversation is over', ended.ended === true, JSON.stringify(ended));
  check('a quiet talk is cut after a sensible pause', IDLE_MS >= 5000 && IDLE_MS <= 60000, String(IDLE_MS));



  // the server copies each description into the Gemini declaration and cuts it at 1000 characters (declarations.py): a longer one loses its tail in silence
  check('every tool description fits the server limit of 1000 characters', toolSpecs.every((s) => s.description.length <= 1000), toolSpecs.filter((s) => s.description.length > 1000).map((s) => `${s.name}:${s.description.length}`).join(', '));

  console.log(failed ? `\n${failed} FAILED` : '\nall passed');
  process.exit(failed ? 1 : 0);
})();
