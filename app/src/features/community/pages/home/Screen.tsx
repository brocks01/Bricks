import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getCommunity, setGoing, type CommunityDetail } from '../../../../api/communities';
import { Button, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useLanguage, useT } from '../../../../i18n';
import { El, usePageWords } from '../../../../kit';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { communityHome as page } from './page';

// Community Home, as in ui-samples/10-community-screens.webp (screen 1). Everything shown comes from the database.
const AREAS: { id: 'events' | 'activities' | 'people' | 'initiatives'; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'events', icon: 'calendar-outline' },
  { id: 'activities', icon: 'layers-outline' },
  { id: 'people', icon: 'people-outline' },
  { id: 'initiatives', icon: 'leaf-outline' },
];

export default function CommunityHome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = usePageWords(page);
  const t = useT();
  const lang = useLanguage();
  const { status } = useStore(sessionStore);
  const [data, setData] = useState<CommunityDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [showSoon, setShowSoon] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getCommunity(String(id)).then(setData).catch(() => setFailed(true));
  }, [id]);
  useEffect(() => {
    if (status === 'in' && id) load(); // wait until the saved sign-in has been checked, so the request carries a token
  }, [status, id, load]);

  const toggle = async (activityId: string, now: boolean) => {
    const patch = (going: boolean) => setData((d) => (d ? { ...d, activities: d.activities.map((a) => (a.id === activityId ? { ...a, i_going: going, going_count: a.going_count + (going === now ? 0 : going ? 1 : -1) } : a)) } : d));
    patch(!now); // show it at once, undo if the server refuses
    try {
      await setGoing(activityId, !now);
    } catch {
      patch(now);
    }
  };

  const when = (iso: string) => new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const ago = (iso: string) => {
    const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    const abs = Math.abs(mins);
    return abs < 60 ? rtf.format(mins, 'minute') : abs < 1440 ? rtf.format(Math.round(mins / 60), 'hour') : rtf.format(Math.round(mins / 1440), 'day');
  };
  const card = { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.sm } as const;

  if (failed) {
    return (
      <Screen title={w('heading')} back>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('notFound')}</Text>
        <Button label={w('tryAgain')} onPress={load} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen title={w('heading')} back>
        <Text style={[type.body, { color: colors.muted }]}>{w('loading')}</Text>
      </Screen>
    );
  }
  const c = data.community;
  const next = data.activities.slice(0, 3);
  const updates = data.announcements.slice(0, 3);

  return (
    <Screen title={c.name} back>
      <El page={page} id="heading"><Text style={[type.small, { color: colors.muted, marginBottom: space.md }]}>{w('yourCommunity')}</Text></El>

      <View style={{ minHeight: 130, borderRadius: radius.card, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentLine, padding: space.md, justifyContent: 'flex-end', marginBottom: space.md, overflow: 'hidden' }}>
        <Ionicons name="business" size={72} color={colors.accent} style={{ position: 'absolute', right: 16, top: 14, opacity: 0.2 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="business" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink }}>{c.name}</Text>
            <Text style={[type.small, { color: colors.muted }]}>{[c.area_name, t('common.members', { n: c.member_count })].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {AREAS.map((a) => (
          <View key={a.id} style={{ flex: 1 }}>
            <El page={page} id={a.id}>
              <Pressable onPress={() => setShowSoon(true)} accessibilityRole="button" style={{ alignItems: 'center', gap: 6, paddingVertical: space.sm, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}>
                <Ionicons name={a.icon} size={24} color={colors.accent} />
                <Text style={[type.small, { color: colors.ink }]} numberOfLines={1}>{w(a.id)}</Text>
              </Pressable>
            </El>
          </View>
        ))}
      </View>
      {showSoon ? <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginTop: space.xs }]}>{w('soon')}</Text> : null}

      <El page={page} id="happening"><Text style={[type.h2, { color: colors.ink, marginTop: space.lg, marginBottom: space.sm }]}>{w('happening')}</Text></El>
      {next.length ? next.map((a) => (
        <View key={a.id} style={[card, { flexDirection: 'row', alignItems: 'center', gap: space.md }]}>
          <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="calendar" size={26} color={colors.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{a.title}</Text>
            <Text style={[type.small, { color: colors.muted }]}>{when(a.starts_at)}</Text>
            {a.location ? <Text style={[type.small, { color: colors.muted }]}>{a.location}</Text> : null}
          </View>
          <Pressable onPress={() => void toggle(a.id, a.i_going)} accessibilityRole="button" style={{ minWidth: 72, minHeight: 44, borderRadius: radius.button, backgroundColor: a.i_going ? colors.accent : colors.accentSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: a.i_going ? '#FFFFFF' : colors.accent }}>{a.i_going ? w('going') : w('join')}</Text>
          </Pressable>
        </View>
      )) : <Text style={[type.body, { color: colors.muted, marginBottom: space.sm }]}>{w('noHappening')}</Text>}

      <El page={page} id="updates"><Text style={[type.h2, { color: colors.ink, marginTop: space.md, marginBottom: space.sm }]}>{w('updates')}</Text></El>
      {updates.length ? updates.map((u) => (
        <View key={u.id} style={card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Ionicons name={u.pinned ? 'pin' : 'megaphone-outline'} size={20} color={colors.accent} />
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink }}>{u.title}</Text>
            <Text style={[type.small, { color: colors.muted }]}>{ago(u.created_at)}</Text>
          </View>
          <Text style={[type.body, { color: colors.ink, marginTop: space.xs }]} numberOfLines={3}>{u.body}</Text>
          {u.author ? <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>{u.author}</Text> : null}
        </View>
      )) : <Text style={[type.body, { color: colors.muted }]}>{w('noUpdates')}</Text>}
    </Screen>
  );
}
