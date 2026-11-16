import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { getInbox } from '../api/wisdom';
import { useStore } from '../core/store';
import { useGoBack, useNavigate } from '../navigation';
import { sessionStore } from '../session/store';
import { colors, space, type } from '../theme/tokens';

/**
 * The Interchange mark: a green leaf. Rasterised to PNG (`assets/brand/mark.png`) and used at any size, so one file updates every header and the welcome screen together.
 */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/brand/mark.png')}
      accessibilityLabel="Interchange"
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
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

/** Top of every main page, as in the design: a white bar with the mark and name on the left and the person's round profile button (navy, initials, gold ring) on the right. */
export function AppHeader() {
  const go = useNavigate();
  const { user } = useStore(sessionStore);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    getInbox().then((r) => setUnread(r.unread)).catch(() => undefined);
  }, []);
  const name = (user?.display_name ?? user?.email ?? '').trim();
  const words = name.split(/\s+/).filter(Boolean);
  const initials = ((words[0]?.charAt(0) ?? '?') + (words.length > 1 ? words[words.length - 1].charAt(0) : '')).toUpperCase();
  return (
    <View style={{ height: 64, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderBottomWidth: 1, borderColor: colors.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Logo size={34} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: colors.ink, letterSpacing: -0.2 }}>Interchange</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => go('channels.notices')} hitSlop={8}>
          <Ionicons name="notifications-outline" size={26} color={colors.ink} accessible={false} />
          {unread > 0 ? <View style={{ position: 'absolute', right: -1, top: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.card }} /> : null}
        </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={() => go('me.index')} hitSlop={6} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.gold }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>{initials}</Text>
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
        <Ionicons name="arrow-back" size={26} color={colors.ink} accessible={false} />
      </Pressable>
      <Text style={[type.h2, { color: colors.ink }]} accessibilityRole="header">{title}</Text>
    </View>
  );
}
