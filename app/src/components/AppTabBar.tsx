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
 * The bottom bar. Wisdom is the round, raised button in the middle: it is the heart of the product (what a lifetime taught, passed on).
 * Communities is on its left (people near you, a reason to show up) and the Marketplace on its right (what experience and craft can earn, market days).
 * Which of the three a person sees is decided by the server's profile, never hard-coded here: a young learner sees Wisdom alone,
 * an elder who came to share sees Wisdom and the Marketplace, someone who came for company sees all three.
 * Today, health, family, notifications and chats are reached from the profile (the round avatar at the top right).
 * The agent is one small round button floating just above this bar (AgentOrb). It shows on every screen, signed in or not, including setup and onboarding.
 */
const COMMUNITIES = 'connect.index';
const WISDOM = 'wisdom.index';
const MARKET = 'market.index';
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
  const onboarding = current?.module === 'onboarding' || ['auth.welcome', 'auth.textSize', 'auth.who'].includes(current?.key ?? '');
  // The family list is refetched once on every sign-in, and again whenever the family screens change something.
  useEffect(() => {
    if (status === 'in') void loadFamilies().catch(() => undefined);
  }, [status]);
  // Signed out, the agent button stays: someone who cannot follow the sign-in can still ask for help (before sign-in the agent can only SEE and explain).
  if (status !== 'in') {
    return (
      <View style={{ backgroundColor: colors.card, position: 'relative', zIndex: 5 }}>
        <View style={{ paddingBottom: insets.bottom }} />
        {onboarding ? null : <AgentOrb />}
      </View>
    );
  }
  // Setup, onboarding and full-screen pages have no tabs, but the agent stays: a person can talk their way through getting started, in their own language.
  if (!user?.profile_complete || current?.bare) {
    return (
      <View style={{ backgroundColor: colors.card, position: 'relative', zIndex: 5 }}>
        <View style={{ paddingBottom: insets.bottom }} />
        {onboarding ? null : <AgentOrb />}
      </View>
    );
  }
  const lit = TAB_OF_MODULE[current?.module ?? ''] ?? (current?.tab ? current.key : '');
  const centre = !prof.profile || showsWisdom(prof); // until the server has answered, show all three
  const left = shows(prof, 'community');
  const right = shows(prof, 'markets') || shows(prof, 'freelance');
  const side = (key: string, icon: keyof typeof Ionicons.glyphMap) => {
    const on = lit === key;
    return (
      <Pressable onPress={() => go(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ height: 66, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Ionicons name={icon} size={24} color={on ? colors.leaf : '#5A6472'} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: on ? colors.leaf : '#5A6472' }}>{t(`${key}.tab`)}</Text>
      </Pressable>
    );
  };
  const wisdomOn = lit === WISDOM;
  return (
    <View style={{ backgroundColor: colors.card, position: 'relative', zIndex: 5 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 82, borderTopWidth: 1, borderColor: colors.line }}>
        <View style={{ flex: 1 }}>{left ? side(COMMUNITIES, 'people-outline') : null}</View>
        <View style={{ width: centre ? 110 : 0, height: 82 }}>
          {centre ? (
            <Pressable
              onPress={() => go(WISDOM)}
              accessibilityRole="tab"
              accessibilityState={{ selected: wisdomOn }}
              style={{ position: 'absolute', left: 17, top: -22, width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: colors.card, backgroundColor: wisdomOn ? colors.leaf : '#3F7A5A', alignItems: 'center', justifyContent: 'center', gap: 2, shadowColor: colors.leaf, shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
            >
              <Ionicons name="leaf" size={26} color="#FFFFFF" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>{t(`${WISDOM}.tab`)}</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={{ flex: 1 }}>{right ? side(MARKET, 'storefront-outline') : null}</View>
      </View>
      <View style={{ height: insets.bottom, backgroundColor: colors.card }} />
      <AgentOrb />
    </View>
  );
}
