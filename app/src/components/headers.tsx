import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useStore } from '../core/store';
import { useGoBack, useNavigate } from '../navigation';
import { sessionStore } from '../session/store';
import { colors, space, type } from '../theme/tokens';

/** The Bricks mark: three green bricks stacked. */
export function Logo({ size = 28 }: { size?: number }) {
  const w = size;
  const h = size / 3.2;
  const brick = { height: h, borderRadius: 3, backgroundColor: colors.accent, marginBottom: 2 };
  return (
    <View style={{ width: w, alignItems: 'center' }} accessibilityLabel="Bricks">
      <View style={[brick, { width: w * 0.42 }]} />
      <View style={{ flexDirection: 'row', gap: 2 }}>
        <View style={[brick, { width: w * 0.48 }]} />
        <View style={[brick, { width: w * 0.48 }]} />
      </View>
      <View style={[brick, { width: w * 0.9 }]} />
    </View>
  );
}

/** A round avatar with the person's initial. A photo comes later. */
export function Avatar({ name, size = 40, dot }: { name: string; size?: number; dot?: boolean }) {
  const initial = (name.trim().charAt(0) || '?').toUpperCase();
  return (
    <View style={{ width: size, height: size }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accentSoft, borderWidth: 2, borderColor: colors.accentLine, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: size * 0.42, fontWeight: '700', color: colors.accent }}>{initial}</Text>
      </View>
      {dot ? <View style={{ position: 'absolute', right: 0, bottom: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.card }} /> : null}
    </View>
  );
}

/** Top of every tab page: logo and name on the left, the bell and the person's avatar (which opens their profile) on the right. */
export function AppHeader() {
  const go = useNavigate();
  const { user } = useStore(sessionStore);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Logo />
        <Text style={{ fontSize: 22, fontWeight: '700', color: colors.accent }}>Bricks</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" hitSlop={10}>
          <Ionicons name="notifications-outline" size={24} color={colors.ink} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => go('me.index')} hitSlop={6}>
          <Avatar name={user?.display_name ?? user?.email ?? ''} dot />
        </Pressable>
      </View>
    </View>
  );
}

/** Top of inner pages: a back arrow and the page title. */
export function BackHeader({ title }: { title: string }) {
  const back = useGoBack();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: colors.bg, gap: 14 }}>
      <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" hitSlop={10}>
        <Ionicons name="arrow-back" size={26} color={colors.ink} />
      </Pressable>
      <Text style={[type.h2, { color: colors.ink }]} accessibilityRole="header">{title}</Text>
    </View>
  );
}
