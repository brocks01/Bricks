import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgentDock } from '../agent/dock';
import { surfaceStore } from '../agent/surface';
import { useStore } from '../core/store';
import { loadFamilies, useFamilies } from '../features/family/state';
import { useT } from '../i18n';
import { tabPages, useCurrentPage, useNavigate } from '../navigation';
import { sessionStore } from '../session/store';
import { colors } from '../theme/tokens';

/**
 * The bottom bar, built from the registry: one icon and label for every page that declares a tab.
 * It shows only when someone is signed in with a finished profile, and never on the sign-in pages.
 * The Bricks Agent bar sits under it, always, at the very bottom.
 *
 * While the Agent Canvas is open the Connect/Grow tabs are hidden (design rule 1: no duplicate navigation) -
 * the Canvas takes the space they occupied, and the agent bar stays. Closing the Canvas brings the tabs back,
 * on the page the person was already on.
 */
export function AppTabBar() {
  const t = useT();
  const go = useNavigate();
  const current = useCurrentPage();
  const { status, user } = useStore(sessionStore);
  const insets = useSafeAreaInsets();
  // The Family tab is only there when the person actually belongs to a family, so we keep the list fresh:
  // refetched once on every sign-in, and again whenever the family screens change something.
  const { families } = useFamilies();
  useEffect(() => {
    if (status === 'in') void loadFamilies().catch(() => undefined);
  }, [status]);
  // The tabs sit just above the agent bar and go away as soon as the agent area is pulled open (it is never shorter than 16% of the area once it shows),
  // including while the hand is still dragging it, and come back when it is put away.
  const { open, live } = useStore(surfaceStore);
  const canvasOpen = open || (live !== null && live > 0.1);
  // Signed out, the agent bar stays: an elderly person who cannot follow the sign-in or the code
  // can still ask for help at any moment (before login the agent can only SEE and explain).
  if (status !== 'in') {
    return (
      <View style={{ backgroundColor: colors.card }}>
        {canvasOpen ? null : <View style={{ paddingBottom: insets.bottom }} />}
        {open ? null : <AgentDock />}
      </View>
    );
  }
  if (!user?.profile_complete || current?.bare) return null;
  return (
    <View style={{ backgroundColor: colors.card }}>
      {canvasOpen ? null : (
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line, paddingTop: 4, paddingBottom: 6 + insets.bottom }}>
          {tabPages()
            .filter((p) => p.key !== 'family.home' || (families?.length ?? 0) > 0) // the rule: the tab exists only with a family
            .map((p) => {
            const active = current?.key === p.key;
            const icon = (active ? p.icon : `${p.icon}-outline`) as keyof typeof Ionicons.glyphMap;
            return (
              <Pressable key={p.key} onPress={() => go(p.key)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={{ flex: 1, alignItems: 'center', gap: 1 }}>
                <Ionicons name={icon} size={24} color={active ? colors.accent : colors.muted} />
                <Text style={{ fontSize: 11, fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.muted }}>{t(`${p.key}.tab`)}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {/* Once the sheet is open it has its own control row (keyboard, mic, waveform), so the peek bar steps aside. It stays while a hand is still dragging it. */}
      {open ? null : <AgentDock />}
    </View>
  );
}
