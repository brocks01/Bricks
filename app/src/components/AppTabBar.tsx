import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../core/store';
import { loadFamilies } from '../features/family/state';
import { profileStore, shows, showsWisdom } from '../features/onboarding/state';
import { useT } from '../i18n';
import { useCurrentPage, useNavigate } from '../navigation';
import { sessionStore } from '../session/store';
import { colors } from '../theme/tokens';
import { AgentOrb } from './AgentOrb';

/**
 * The bottom bar: four equal tabs, Home, Communities, Marketplace, Wisdom, each an icon and a word.
 * The lit one is told apart three ways (a filled icon, the accent colour and a bar above it), never by colour alone.
 * It shows ONLY on the four tab pages: every other page is a sub-screen with the floating Back button and no bar.
 * Home and Communities always show; the server's profile may hide the Marketplace or Wisdom for a person who said no to them.
 * The agent is one small round button floating just above this bar (AgentOrb). It shows on every screen, signed in or not.
 */
type IconName = keyof typeof Ionicons.glyphMap;
const TABS: { key: string; on: IconName; off: IconName }[] = [
  { key: 'home.index', on: 'home', off: 'home-outline' },
  { key: 'connect.index', on: 'people', off: 'people-outline' },
  { key: 'market.index', on: 'storefront', off: 'storefront-outline' },
  { key: 'wisdom.index', on: 'book', off: 'book-outline' },
];
const BAR_HEIGHT = 68;

export function AppTabBar() {
  const t = useT();
  const go = useNavigate();
  const current = useCurrentPage();
  const { status, user } = useStore(sessionStore);
  const prof = useStore(profileStore);
  const insets = useSafeAreaInsets();
  // The family list is refetched once on every sign-in, and again whenever the family screens change something.
  useEffect(() => {
    if (status === 'in') void loadFamilies().catch(() => undefined);
  }, [status]);
  const onTab = TABS.some((x) => x.key === current?.key);
  // Signed out, in setup or onboarding, and on every sub-screen there are no tabs, but the agent stays:
  // someone who cannot follow a page can still ask for help (before sign-in the agent can only SEE and explain).
  if (status !== 'in' || !user?.profile_complete || !onTab) {
    return (
      <View style={{ backgroundColor: colors.card, position: 'relative', zIndex: 5 }}>
        <View style={{ paddingBottom: insets.bottom }} />
        <AgentOrb />
      </View>
    );
  }
  // Until the server has answered, show all four.
  const visible = (key: string) =>
    key === 'market.index' ? !prof.profile || shows(prof, 'markets') || shows(prof, 'freelance')
    : key === 'wisdom.index' ? !prof.profile || showsWisdom(prof)
    : true;
  return (
    <View style={{ backgroundColor: colors.card, position: 'relative', zIndex: 5, borderTopWidth: 1, borderColor: colors.line }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', minHeight: BAR_HEIGHT }}>
        {TABS.filter((x) => visible(x.key)).map((x) => {
          const on = current?.key === x.key;
          return (
            <Pressable key={x.key} onPress={() => go(x.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, minHeight: BAR_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 2, paddingBottom: 6 }}>
              <View style={{ position: 'absolute', top: 0, width: 44, height: 4, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: on ? colors.accent : 'transparent' }} />
              <Ionicons name={on ? x.on : x.off} size={27} color={on ? colors.accent : colors.muted} accessible={false} />
              <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 17, fontWeight: on ? '800' : '600', color: on ? colors.accentDark : colors.muted, textAlign: 'center' }}>{t(`${x.key}.tab`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ height: insets.bottom }} />
      <AgentOrb />
    </View>
  );
}
