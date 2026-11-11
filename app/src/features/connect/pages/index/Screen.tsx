import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getMyCommunities, getUpcoming, setGoing, type MyCommunity, type Upcoming } from '../../../../api/communities';
import { Button, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useLanguage, useT } from '../../../../i18n';
import { El, useField, usePageWords } from '../../../../kit';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { connectIndex as page } from './page';

// The Connect dashboard, as in the owner's Connect sample (see team-docs/06-technical/ui-build-spec.md): heading, find (with a filter button), My communities (a picture or symbol,
// name, members), ONE green Join-or-create entry, and a compact Coming up with a Join button. Nothing else belongs here.
// Everything shown comes from the database. A community without a cover picture shows its symbol on a soft tile.
const TINTS = ['#E3F1E7', '#E8E6F8', '#E6F4E1', '#FBEFD9'];
const symbol = (name: string) => (name in (Ionicons.glyphMap as Record<string, unknown>) ? (name as keyof typeof Ionicons.glyphMap) : 'people');

function Thumb({ icon, size, i }: { icon: string; size: number; i: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: 14, backgroundColor: TINTS[i % TINTS.length], alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={symbol(icon)} size={size * 0.5} color={colors.accent} />
    </View>
  );
}

export default function ConnectIndex() {
  const w = usePageWords(page);
  const t = useT();
  const lang = useLanguage();
  const { status } = useStore(sessionStore);
  const [mine, setMine] = useState<MyCommunity[] | null>(null);
  const [soon, setSoon] = useState<Upcoming[]>([]);
  const [q, setQ] = useState('');
  useField(page, 'find', q, (v) => setQ(String(v)));
  useEffect(() => {
    if (status !== 'in') return; // wait until the saved sign-in has been checked, so the requests carry a token
    getMyCommunities().then(setMine).catch(() => setMine([]));
    getUpcoming(3).then(setSoon).catch(() => setSoon([]));
  }, [status]);

  const toggle = useCallback(async (e: Upcoming) => {
    const next = !e.i_going;
    setSoon((l) => l.map((x) => (x.id === e.id ? { ...x, i_going: next } : x))); // show it at once, undo if the server refuses
    try {
      await setGoing(e.id, next);
    } catch {
      setSoon((l) => l.map((x) => (x.id === e.id ? { ...x, i_going: !next } : x)));
    }
  }, []);

  const list = (mine ?? []).filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  const when = (iso: string) => new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const card = { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.sm, marginBottom: space.sm } as const;

  return (
    <Screen title={w('heading')} subtitle={w('intro')}>
      {mine && mine.length ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.button, paddingHorizontal: space.md }}>
            <Ionicons name="search-outline" size={20} color={colors.muted} style={{ marginRight: 10 }} />
            <El page={page} id="find">
              <View style={{ flex: 1 }}>
                <FindInput value={q} onChange={setQ} placeholder={w('find')} />
              </View>
            </El>
          </View>
          <El page={page} id="filter">
            <View accessibilityRole="button" accessibilityState={{ disabled: true }} style={{ width: 48, height: 48, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="options-outline" size={22} color={colors.ink} />
            </View>
          </El>
        </View>
      ) : null}

      {mine && mine.length ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.sm }}>
            <El page={page} id="mine"><Text style={[type.h2, { color: colors.ink }]}>{w('mine')}</Text></El>
            <Text style={[type.small, { color: colors.muted }]}>{mine.length === 1 ? w('countOne') : w('countMany', { n: mine.length })}</Text>
          </View>
          {list.length ? (
            list.map((c, i) => (
              <View key={c.id} style={card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <Thumb icon={c.icon} size={64} i={i} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink }}>{c.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Ionicons name="people-outline" size={16} color={colors.muted} />
                      <Text style={[type.small, { color: colors.muted }]}>{t('common.members', { n: c.member_count })}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={colors.ink} />
                </View>
              </View>
            ))
          ) : (
            <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('noMatch')}</Text>
          )}
        </>
      ) : null}

      {mine && !mine.length ? (
        <View style={[card, { backgroundColor: colors.accentSoft, borderColor: colors.accentLine, padding: space.lg, alignItems: 'center', gap: space.sm }]}>
          <Ionicons name="people" size={40} color={colors.accent} />
          <El page={page} id="noCommunity"><Text style={[type.h2, { color: colors.ink, textAlign: 'center' }]}>{w('noCommunity')}</Text></El>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>{w('noCommunityBody')}</Text>
        </View>
      ) : null}

      <El page={page} id="joinOrCreate"><Button label={w('joinOrCreate')} onPress={() => undefined} disabled icon="add-circle" /></El>
      <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginTop: space.xs, marginBottom: space.lg }]}>{w('soon')}</Text>

      {soon.length ? (
        <>
          <El page={page} id="comingUp"><Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>{w('comingUp')}</Text></El>
          {soon.map((e, i) => (
            <View key={e.id} style={card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Thumb icon={e.community_icon} size={72} i={i} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{e.title}</Text>
                  <Text style={[type.small, { color: colors.muted }]}>{e.community_name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar-outline" size={15} color={colors.muted} />
                    <Text style={[type.small, { color: colors.ink }]}>{when(e.starts_at)}</Text>
                  </View>
                </View>
                <Pressable onPress={() => void toggle(e)} accessibilityRole="button" style={{ minWidth: 76, minHeight: 44, borderRadius: radius.button, backgroundColor: e.i_going ? colors.accent : colors.accentSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: e.i_going ? '#FFFFFF' : colors.accent }}>{e.i_going ? w('rsvpGoing') : w('rsvpJoin')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

// A bare text input (the border and icon are drawn by the row around it).
import { TextInput } from 'react-native';
function FindInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} accessibilityLabel={placeholder} autoCapitalize="none" autoCorrect={false} style={{ fontSize: 17, paddingVertical: 12, color: colors.ink }} />;
}
