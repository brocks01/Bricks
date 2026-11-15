import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../core/store';
import { loadFamilies } from '../features/family/state';
import { useT } from '../i18n';
import { useCurrentPage, useNavigate } from '../navigation';
import { sessionStore } from '../session/store';
import { colors } from '../theme/tokens';
import { AgentOrb } from './AgentOrb';

/**
 * The bottom bar, drawn like the owner's design artifact: three places. Communities on the left, the Marketplace on the right, and Home in the middle
 * as a raised round navy button with a gold house. The tree and the full progress are part of Home (a card on it that opens the whole page). Health, family,
 * the calendar list and settings are reached from the profile (the round button at the top right). The agent is one small round button floating just above
 * this bar (AgentOrb). It shows only when someone is signed in with a finished profile, and never on the sign-in pages.
 */
const LEFT = 'connect.index';
const MIDDLE = 'home.index';
const RIGHT = 'market.index';
// Which of the three a page belongs to, so the pages behind a tab keep it lit. Profile pages (me, health, family, language) light none.
const TAB_OF_MODULE: Record<string, string> = {
  connect: LEFT, community: LEFT, explore: LEFT,
  home: MIDDLE, calendar: MIDDLE, grow: MIDDLE,
  market: RIGHT,
};

export function AppTabBar() {
  const t = useT();
  const go = useNavigate();
  const current = useCurrentPage();
  const { status, user } = useStore(sessionStore);
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
  if (!user?.profile_complete || current?.bare) return null;
  const lit = TAB_OF_MODULE[current?.module ?? ''] ?? (current?.tab ? current.key : '');
  const side = (key: string, icon: keyof typeof Ionicons.glyphMap, label: string) => {
    const on = lit === key;
    return (
      <Pressable onPress={() => go(key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ height: 66, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Ionicons name={icon} size={24} color={on ? colors.navy : '#5A6472'} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: on ? colors.navy : '#5A6472' }}>{label}</Text>
      </Pressable>
    );
  };
  const homeOn = lit === MIDDLE;
  return (
    <View style={{ backgroundColor: colors.card, position: 'relative', zIndex: 5 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 82, borderTopWidth: 1, borderColor: colors.line }}>
        <View style={{ flex: 1 }}>{side(LEFT, 'people-outline', t(`${LEFT}.tab`))}</View>
        <View style={{ width: 110, height: 82 }}>
          <Pressable
            onPress={() => go(MIDDLE)}
            accessibilityRole="tab"
            accessibilityState={{ selected: homeOn }}
            style={{ position: 'absolute', left: 17, top: -22, width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: colors.card, backgroundColor: homeOn ? colors.navy : '#46556E', alignItems: 'center', justifyContent: 'center', gap: 2, shadowColor: colors.navy, shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}
          >
            <Ionicons name="home-outline" size={24} color={colors.gold} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>{t(`${MIDDLE}.tab`)}</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1 }}>{side(RIGHT, 'storefront-outline', t(`${RIGHT}.tab`))}</View>
      </View>
      <View style={{ height: insets.bottom, backgroundColor: colors.card }} />
      <AgentOrb />
    </View>
  );
}
