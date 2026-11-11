import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { AgentDock } from '../agent/dock';
import { useStore } from '../core/store';
import { useT } from '../i18n';
import { tabPages, useCurrentPage, useNavigate } from '../navigation';
import { sessionStore } from '../session/store';
import { colors } from '../theme/tokens';

/**
 * The bottom bar, built from the registry: one icon and label for every page that declares a tab.
 * It shows only when someone is signed in with a finished profile, and never on the sign-in pages.
 * The Bricks Agent bar sits under it, always, at the very bottom.
 */
export function AppTabBar() {
  const t = useT();
  const go = useNavigate();
  const current = useCurrentPage();
  const { status, user } = useStore(sessionStore);
  if (status !== 'in' || !user?.profile_complete || current?.bare) return null;
  return (
    <View style={{ backgroundColor: colors.card }}>
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line, paddingTop: 8, paddingBottom: 10 }}>
        {tabPages().map((p) => {
          const active = current?.key === p.key;
          const icon = (active ? p.icon : `${p.icon}-outline`) as keyof typeof Ionicons.glyphMap;
          return (
            <Pressable key={p.key} onPress={() => go(p.key)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <Ionicons name={icon} size={26} color={active ? colors.accent : colors.muted} />
              <Text style={{ fontSize: 12, fontWeight: active ? '700' : '500', color: active ? colors.accent : colors.muted }}>{t(`${p.key}.tab`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <AgentDock />
    </View>
  );
}
