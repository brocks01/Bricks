#!/usr/bin/env node
/**
 * Starts a new page that already looks like the rest of the app.
 *
 *   npm run new:page -- <route> --title "Page title" [--section <section>]
 *
 *   npm run new:page -- settings/privacy --title "Privacy" --section settings
 *   npm run new:page -- garden --title "Community garden" --section community
 *
 * It writes:
 *   src/app/<route>.tsx                  the page, built on <Screen> with a Card
 *   src/i18n/locales/{en,ms,zh,ta}.json  its words under "pages.<name>" (translate ms/zh/ta!)
 *   src/__tests__/pages/<name>.test.tsx  opens the page and checks it renders
 *
 * <Screen> gives every page the olive wash, Read it out, Back, Help, Buddy, the offline
 * banner, pull to refresh and small-phone spacing. `npm run lint` then keeps the page on
 * the design system (eslint/design-system.js): no typed-in sizes, colours or words.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SECTIONS = ['home', 'community', 'activity', 'health', 'settings'];
const LOCALES = ['en', 'ms', 'zh', 'ta'];

function fail(message) {
  console.error(`new:page: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { route: null, title: null, section: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--title') args.title = argv[++i];
    else if (a === '--section') args.section = argv[++i];
    else if (a.startsWith('--')) fail(`unknown option ${a}`);
    else if (!args.route) args.route = a;
    else fail(`unexpected argument ${a}`);
  }
  return args;
}

const { route, title, section } = parseArgs(process.argv.slice(2));
if (!route || !title) {
  fail(
    'usage: npm run new:page -- <route> --title "Page title" [--section ' +
      SECTIONS.join('|') +
      ']',
  );
}
if (section && !SECTIONS.includes(section)) {
  fail(`--section must be one of ${SECTIONS.join(', ')}`);
}
const clean = route.replace(/^\/+|\/+$/g, '').replace(/\.tsx$/, '');
if (!/^[a-z0-9()\-/]+$/.test(clean) || /(^|\/)_/.test(clean)) {
  fail(
    'route: lower-case words, dashes and folders only, e.g. settings/privacy (no [params] or _layout)',
  );
}

const file = path.join(ROOT, 'src', 'app', `${clean}.tsx`);
if (fs.existsSync(file)) fail(`${path.relative(ROOT, file)} already exists`);

// settings/privacy → settingsPrivacy (its key in the language files), screen-settings-privacy.
const words = clean
  .split('/')
  .filter((s) => !/^\(.*\)$/.test(s) && s !== 'index')
  .flatMap((s) => s.split('-'));
if (words.length === 0) fail('route needs at least one name');
const name = words.map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1))).join('');
const slug = words.join('-');
const component = name[0].toUpperCase() + name.slice(1) + 'Screen';
const url =
  '/' +
  clean
    .split('/')
    .filter((s) => !/^\(.*\)$/.test(s))
    .join('/')
    .replace(/\/?index$/, '');
const body = `What ${title} is for, in one or two plain sentences.`;

// 1. The words, in every language (the same keys everywhere: src/i18n/locales.test.ts).
for (const lang of LOCALES) {
  const p = path.join(ROOT, 'src', 'i18n', 'locales', `${lang}.json`);
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));
  json.pages ??= {};
  if (json.pages[name]) fail(`pages.${name} is already in ${lang}.json`);
  json.pages[name] = { title, body };
  fs.writeFileSync(p, JSON.stringify(json, null, 2) + '\n');
}

// 2. The page.
const key = `pages.${name}`;
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(
  file,
  `import { useTranslation } from 'react-i18next';

import { Card, Screen, Text } from '@/components';

/**
 * ${title}: what this page is for, in a sentence.
 *
 * Built on <Screen>, so it already has the page wash, Read it out, Back, Help, Buddy,
 * the offline banner and small-phone spacing. Build the rest from @/components, size
 * anything custom with @/theme tokens, and put every word in the language files
 * (\`npm run lint\` checks all three).
 */
export default function ${component}() {
  const { t } = useTranslation();

  return (
    <Screen
${section ? `      section="${section}"\n` : ''}      title={t('${key}.title')}
      readOut={() => \`\${t('${key}.title')}. \${t('${key}.body')}\`}
      testID="screen-${slug}"
    >
      <Card>
        <Text>{t('${key}.body')}</Text>
      </Card>
    </Screen>
  );
}
`,
);

// 3. A test that opens it.
const testFile = path.join(ROOT, 'src', '__tests__', 'pages', `${name}.test.tsx`);
fs.mkdirSync(path.dirname(testFile), { recursive: true });
fs.writeFileSync(
  testFile,
  `import { screen } from 'expo-router/testing-library';

import { renderApp, resetAppState } from '@/test-utils/renderApp';

jest.setTimeout(30_000);

beforeEach(async () => {
  await resetAppState();
});

describe('${title} page', () => {
  it('opens on the shared page layout', async () => {
    await renderApp('${url}');
    expect(await screen.findByTestId('screen-${slug}')).toBeTruthy();
    expect(screen.getByText(${JSON.stringify(title)})).toBeTruthy();
  });
});
`,
);

const written = [
  file,
  testFile,
  ...LOCALES.map((l) => path.join(ROOT, 'src', 'i18n', 'locales', `${l}.json`)),
];
try {
  // Prettier straight from node_modules: no shell, so paths with brackets stay intact.
  const prettier = require.resolve('prettier/bin/prettier.cjs', { paths: [ROOT] });
  execFileSync(process.execPath, [prettier, '--write', ...written], { cwd: ROOT, stdio: 'ignore' });
} catch {
  console.warn('new:page: prettier did not run; run `npm run format` before committing.');
}

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
console.log(`Created ${url}
  ${rel(file)}
  ${rel(testFile)}
  src/i18n/locales/*.json  → pages.${name}

Next:
  1. Translate pages.${name} in ms.json, zh.json and ta.json (they start in English).
  2. Build the page from @/components; size custom bits with @/theme tokens.
  3. npm run check   (typecheck, lint, format, tests)`);
