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
 * The bottom bar: a soft floating pill. Market is on the left, Wisdom on the right, and Communities is the raised round button in the middle
 * (people near you, a reason to show up). Which of the three a person sees is decided by the server's profile, never hard-coded here.
 * Today, health, family, notifications and chats are reached from the profile (the round avatar at the top right).
 * The agent is one small round button floating just above this bar (AgentOrb). It shows on every screen, signed in or not, including setup and onboarding.
 */
const COMMUNITIES = 'connect.index';
const WISDOM = 'wisdom.index';
const MARKET = 'market.index';
const BLUE = '#1B3FC9';
const SLATE = '#3E4E68';
// Which tab a page belongs to, so the pages behind a tab keep it lit. Profile pages (me, health, family, language, today) light none.
const TAB_OF_MODULE: Record<string, string> = {
  connect: COMMUNITIES, community: COMMUNITIES, explore: COMMUNITIES,
  wisdom: WISDOM,
  market: MARKET,
};

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
  // Signed out, the agent button stays: someone who cannot follow the sign-in can still ask for help (before sign-in the agent can only SEE and explain).
  if (status !== 'in') {
    return (
      <View style={{ backgroundColor: colors.card, position: 'relative', zIndex: 5 }}>
        <View style={{ paddingBottom: insets.bottom }} />
        <AgentOrb />
      </View>
    );
  }
  // Setup, onboarding and full-screen pages have no tabs, but the agent stays: a person can talk their way through getting started, in their own language.
  if (!user?.profile_complete || current?.bare) {
    return (
      <View style={{ backgroundColor: colors.card, position: 'relative', zIndex: 5 }}>
        <View style={{ paddingBottom: insets.bottom }} />
        <AgentOrb />
      </View>
    );
  }
  const lit = TAB_OF_MODULE[current?.module ?? ''] ?? (current?.tab ? current.key : '');
  const right = !prof.profile || showsWisdom(prof); // Wisdom appears when the person said yes to teaching or sharing; until the server has answered, show all three
  const centre = !prof.profile || shows(prof, 'community');
  const left = !prof.profile || shows(prof, 'markets') || shows(prof, 'freelance');
  const side = (key: string, icon: keyof typeof Ionicons.glyphMap) => {
    const on = lit === key;
    return (
      <Pressable onPress={() => go(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ height: 66, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Ionicons name={icon} size={26} color={on ? BLUE : SLATE} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: on ? BLUE : SLATE }}>{t(`${key}.tab`)}</Text>
      </Pressable>
    );
  };
  const communitiesOn = lit === COMMUNITIES;
  return (
    <View style={{ backgroundColor: colors.bg, position: 'relative', zIndex: 5, paddingTop: 22 }}>
      <View style={{ marginHorizontal: 14, marginBottom: 8, height: 72, borderRadius: 36, backgroundColor: '#F1F1F3', flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
        <View style={{ flex: 1 }}>{left ? side(MARKET, 'storefront-outline') : null}</View>
        <View style={{ width: centre ? 120 : 0, height: 72 }}>
          {centre ? (
            <Pressable
              onPress={() => go(COMMUNITIES)}
              accessibilityRole="tab"
              accessibilityState={{ selected: communitiesOn }}
              style={{ position: 'absolute', left: 6, top: -30, width: 108, height: 108, borderRadius: 54, backgroundColor: '#F4F4F6', alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8 }}
            >
              <Ionicons name="people" size={34} color={communitiesOn ? BLUE : SLATE} />
              <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', color: communitiesOn ? BLUE : SLATE }}>{t(`${COMMUNITIES}.tab`)}</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={{ flex: 1 }}>{right ? side(WISDOM, 'book-outline') : null}</View>
      </View>
      <View style={{ height: insets.bottom, backgroundColor: colors.bg }} />
      <AgentOrb />
    </View>
  );
}
