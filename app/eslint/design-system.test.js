/**
 * @jest-environment node
 *
 * The design-system lint rules, run through the app's real ESLint config: a page that
 * follows the system passes; typed-in sizes, colours and words, or a page without
 * <Screen>, fail. Keeps the rules (and their wiring) from being dropped by accident.
 */
const path = require('path');
const { ESLint } = require('eslint');

const ROOT = path.resolve(__dirname, '..');
// The real config, handed over directly (Jest can't run ESLint's own config loader).
const eslint = new ESLint({
  cwd: ROOT,
  overrideConfigFile: true,
  overrideConfig: require('../eslint.config.js'),
});

async function rulesBroken(code, file = 'src/app/zz-lint-probe.tsx') {
  const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, file) });
  return result.messages.map((m) => m.ruleId).sort();
}

const GOOD = `
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Avatar, Card, Screen, Text } from '@/components';
import { avatarSize, color, space } from '@/theme';

export default function Good() {
  const { t } = useTranslation();
  return (
    <Screen section="settings" title={t('notFound.title')} testID="screen-good">
      <Card>
        <View style={styles.row}>
          <Avatar name="Raj" size={avatarSize.lg} />
          <Text>{t('notFound.body')}</Text>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, padding: space.md * 2, margin: 0, backgroundColor: color.bg },
});
`;

jest.setTimeout(60_000);

describe('design-system lint rules', () => {
  it('passes a page built on <Screen> with tokens and translated words', async () => {
    expect(await rulesBroken(GOOD)).toEqual([]);
  });

  it('fails a page that does not render <Screen>', async () => {
    const code = `import { View } from 'react-native';\nexport default function P() { return <View />; }\n`;
    expect(await rulesBroken(code)).toEqual(['design-system/page-uses-screen']);
  });

  it('leaves non-page files alone about <Screen>', async () => {
    const code = `import { View } from 'react-native';\nexport function Part() { return <View />; }\n`;
    expect(await rulesBroken(code, 'src/features/zz/Part.tsx')).toEqual([]);
  });

  it.each([
    ['a style number', `export const s = { padding: 13 };`],
    [
      'a number added to a token',
      `import { space } from '@/theme';\nexport const s = { marginTop: space.sm + 3 };`,
    ],
    ['a font size', `export const s = { fontSize: 18 };`],
    ['a named size constant', `export const COVER = 96;`],
    ['a default size prop', `export function A({ size = 56 }: { size?: number }) { return size; }`],
  ])('fails %s', async (_, code) => {
    expect(await rulesBroken(code, 'src/features/zz/part.tsx')).toEqual([
      'design-system/no-raw-sizes',
    ]);
  });

  it('allows durations, counts and scale factors', async () => {
    const code = `export const TOAST_MS = 5000;\nexport const SHOWN = 5;\nexport const STACK_SCALE = 1.5;\n`;
    expect(await rulesBroken(code, 'src/features/zz/part.ts')).toEqual([]);
  });

  it.each([`'rgba(0, 0, 0, 0.2)'`, `'white'`, `'hsl(10, 50%, 50%)'`])(
    'fails the colour %s',
    async (value) => {
      const code = `export const s = { color: ${value} };`;
      expect(await rulesBroken(code, 'src/features/zz/part.ts')).toEqual([
        'design-system/no-raw-colors',
      ]);
    },
  );

  it('fails words typed into a page', async () => {
    const code = `
import { BigButton, Screen, Text } from '@/components';
export default function P() {
  return (
    <Screen title="Hello">
      <Text>Welcome back</Text>
      <BigButton label="Go" onPress={() => {}} />
    </Screen>
  );
}
`;
    expect(await rulesBroken(code)).toEqual([
      'design-system/no-hardcoded-copy',
      'design-system/no-hardcoded-copy',
      'design-system/no-hardcoded-copy',
    ]);
  });
});
