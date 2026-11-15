import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { getMyCommunities, getUpcoming, setGoing, type MyCommunity, type Upcoming } from '../../../../api/communities';
import { SkeletonList } from '../../../../components/Skeleton';
import { Button, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useLanguage, useT } from '../../../../i18n';
import { El, useField, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { connectIndex as page } from './page';

// The Connect dashboard, as in the owner's Connect sample (see team-docs/06-technical/ui-build-spec.md): heading, find (with a filter button), My communities (a picture or symbol,
// name, members), ONE green Join-or-create entry, and a compact Coming up with a Join button. Nothing else belongs here.
// Everything shown comes from the database. A community without a cover picture shows its symbol on a soft tile.
const TINTS = ['#E3F1E7', '#E8E6F8', '#E6F4E1', '#FBEFD9'];
const symbol = (name: string) => (name in (Ionicons.glyphMap as Record<string, unknown>) ? (name as keyof typeof Ionicons.glyphMap) : 'people');

function Thumb({ icon, size, i, uri }: { icon: string; size: number; i: number; uri?: string | null }) {
  if (uri) return <Image source={{ uri }} accessibilityIgnoresInvertColors style={{ width: size, height: size, borderRadius: 14, backgroundColor: TINTS[i % TINTS.length] }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: 14, backgroundColor: TINTS[i % TINTS.length], alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={symbol(icon)} size={size * 0.5} color={colors.accent} />
    </View>
  );
}

export default function ConnectIndex() {
  const w = usePageWords(page);
  const navigate = useNavigate();
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

  const used = mine?.length ?? 0;
  const full = used >= 3;
  const list = (mine ?? []).filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));
  const when = (iso: string) => new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const card = { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.sm, marginBottom: space.sm } as const;

  // What the agent may read and press: the communities and the events really on this screen. page.ts cannot
  // know how many there are, and until this loads `read` has no data at all - which is why the agent used to
  // claim there were no communities while four were on screen. The actions run this screen's own handlers.
  usePageData(
    page,
    mine === null
      ? null
      : {
          values: [
            { label: w('find'), value: q },
            { label: w('mine'), value: mine.length === 1 ? w('countOne') : w('countMany', { n: mine.length }) },
          ],
          images: [],
          lists: [
            {
              label: w('mine'),
              items: list.map((c, i) => ({
                label: c.name,
                detail: t('common.members', { n: c.member_count }),
                image: c.cover_url ? { uri: c.cover_url, alt: c.name } : undefined,
                actions: [{ id: `community${i + 1}`, label: c.name, run: () => { navigate('community.home', { id: c.id }); } }],
              })),
            },
            {
              label: w('comingUp'),
              items: soon.map((e, i) => ({
                label: e.title,
                detail: `${e.community_name} · ${when(e.starts_at)}`,
                image: e.image_url ? { uri: e.image_url, alt: e.title } : undefined,
                actions: [{ id: `rsvpEvent${i + 1}`, label: e.title, run: () => toggle(e) }],
              })),
            },
          ],
          actions: [
            { id: 'explore', label: w('explore'), run: () => { navigate('connect.explore'); } },
            { id: 'joinOrCreate', label: w('joinOrCreate'), run: () => { navigate('connect.join'); } },
            { id: 'askStart', label: w('askStart'), run: () => { navigate('connect.create'); } },
          ],
        }
  );

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

      {mine === null ? <SkeletonList count={3} /> : null}

      {mine && mine.length ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: space.sm }}>
            <El page={page} id="mine"><Text style={[type.h2, { color: colors.ink }]}>{w('mine')}</Text></El>
            <Text style={[type.small, { color: colors.muted }]}>{mine.length === 1 ? w('countOne') : w('countMany', { n: mine.length })}</Text>
          </View>
          {list.length ? (
            list.map((c, i) => (
              <El key={c.id} page={page} id={`community${i + 1}`}>
                <Pressable onPress={() => navigate('community.home', { id: c.id })} accessibilityRole="button" style={card}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                    <Thumb icon={c.icon} size={64} i={i} uri={c.cover_url} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink }}>{c.name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Ionicons name="people-outline" size={16} color={colors.muted} />
                        <Text style={[type.small, { color: colors.muted }]}>{t('common.members', { n: c.member_count })}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color={colors.ink} />
                  </View>
                </Pressable>
              </El>
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

      <El page={page} id="limitInfo"><Text style={[type.small, { color: full ? colors.warn : colors.muted, fontWeight: full ? '700' : '400', marginBottom: space.sm }]}>{full ? w('full_note', { max: 3 }) : w('limitInfo', { n: used, max: 3 })}</Text></El>
      <El page={page} id="explore"><Button label={w('explore')} onPress={() => { navigate('connect.explore'); }} icon="search" /></El>
      <View style={{ height: space.lg }} />

      {soon.length ? (
        <>
          <El page={page} id="comingUp"><Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>{w('comingUp')}</Text></El>
          {soon.map((e, i) => (
            <View key={e.id} style={card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Thumb icon={e.community_icon} size={72} i={i} uri={e.image_url} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{e.title}</Text>
                  <Text style={[type.small, { color: colors.muted }]}>{e.community_name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="calendar-outline" size={15} color={colors.muted} />
                    <Text style={[type.small, { color: colors.ink }]}>{when(e.starts_at)}</Text>
                  </View>
                </View>
                <El page={page} id={`rsvpEvent${i + 1}`}>
                  <Pressable onPress={() => void toggle(e)} accessibilityRole="button" style={{ minWidth: 76, minHeight: 44, borderRadius: radius.button, backgroundColor: e.i_going ? colors.accent : colors.accentSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: e.i_going ? '#FFFFFF' : colors.accent }}>{e.i_going ? w('rsvpGoing') : w('rsvpJoin')}</Text>
                  </Pressable>
                </El>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {/* The two rarer entries sit quietly at the very bottom, so the page has one clear button. */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs, paddingTop: space.lg, paddingBottom: space.md }}>
        <El page={page} id="joinOrCreate"><QuietLink icon="key-outline" label={w('joinOrCreate')} onPress={() => navigate('connect.join')} /></El>
        <El page={page} id="askStart"><QuietLink icon="add-circle-outline" label={w('askStart')} onPress={() => navigate('connect.create')} /></El>
      </View>
    </Screen>
  );
}

// A bare text input (the border and icon are drawn by the row around it).
function FindInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} accessibilityLabel={placeholder} autoCapitalize="none" autoCorrect={false} style={{ fontSize: 17, paddingVertical: 12, color: colors.ink }} />;
}

// A small text link with an icon: for the entries that are not the main thing on the page.
function QuietLink({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
      <Ionicons name={icon} size={18} color={colors.accent} />
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.accent }}>{label}</Text>
    </Pressable>
  );
}
