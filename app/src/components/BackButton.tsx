import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import '../features/home/shellWords'; // registers the shell's words
import { useT } from '../i18n';
import { useCurrentPage, useNavigate } from '../navigation';
import { colors, radius, space } from '../theme/tokens';
import { Screen } from './ui';

/**
 * THE Back button of every sub-screen: one round-ended button with an arrow and the word "Back", floating at exactly the same
 * top-left place on every page (below the status bar), 56 high, a solid dark fill with a soft shadow so it reads on any background.
 * It goes back one step; when there is nowhere to go back to (the page was opened from a link) it opens the tab the page belongs to.
 */
export const BACK_HEIGHT = 56;
export const BACK_TOP = 8; // below the safe area
export const BACK_LEFT = 16;
/** How much room a sub-screen leaves free at its top so nothing sits under the button. */
export const BACK_SPACE = BACK_TOP + BACK_HEIGHT + 12;

// The tab a page belongs to, by its module. Profile pages (and anything else) go Home.
const TAB_OF_MODULE: Record<string, string> = {
  connect: 'connect.index', community: 'connect.index', explore: 'connect.index', lead: 'connect.index',
  wisdom: 'wisdom.index',
  market: 'market.index', host: 'market.index',
};

export function BackButton() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter(); // read only: is there anything to go back to?
  const go = useNavigate();
  const current = useCurrentPage();
  const back = () => {
    if (router.canGoBack()) router.back();
    else go(TAB_OF_MODULE[current?.module ?? ''] ?? 'home.index', {}, { replace: true });
  };
  return (
    <Pressable
      onPress={back}
      accessibilityRole="button"
      accessibilityLabel={t('shell.back')}
      hitSlop={6}
      style={({ pressed }) => ({
        position: 'absolute', top: insets.top + BACK_TOP, left: BACK_LEFT, zIndex: 30,
        height: BACK_HEIGHT, minWidth: 112, paddingLeft: 14, paddingRight: 22, borderRadius: radius.pill,
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: colors.navy, opacity: pressed ? 0.85 : 1,
        shadowColor: colors.ink, shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
      })}
    >
      <Ionicons name="arrow-back" size={26} color={colors.card} accessible={false} />
      <Text style={{ fontSize: 19, fontWeight: '800', color: colors.card }}>{t('shell.back')}</Text>
    </Pressable>
  );
}

/** The top of a sub-screen's content: the room under the Back button, then the page title (and a line under it). */
export function BackTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ paddingTop: BACK_SPACE - space.lg, marginBottom: space.md }}>
      <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: '800', color: colors.ink }}>{title}</Text>
      {subtitle ? <Text style={{ fontSize: 18, lineHeight: 25, color: colors.muted, marginTop: 4 }}>{subtitle}</Text> : null}
    </View>
  );
}

/** A sub-screen: the same page as `Screen`, with the floating Back button instead of a header bar. No bottom bar shows on it. */
export function BackScreen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <Screen plain title={title} hero={<BackTitle title={title} subtitle={subtitle} />}>{children}</Screen>
      <BackButton />
    </View>
  );
}
