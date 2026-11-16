import { StandingCard } from '../../StandingCard';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { getCommunity, setGoing, type CommunityDetail } from '../../../../api/communities';
import { ApiError } from '../../../../api/client';
import { leaveCommunity, shareWithFamily } from '../../../../api/communityRules';
import { Pill } from '../../../../components/blocks';
import { SkeletonPage } from '../../../../components/Skeleton';
import { Button, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useLanguage, useT } from '../../../../i18n';
import { El, usePageData, usePageWords, type PageDataInput } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { RotaCard, VoteCard } from '../../../lead/LeadBits';
import '../../../lead/leadWords'; // registers the words of the vote and the rota
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
  const [ruleError, setRuleError] = useState<string | null>(null);
  const go = useNavigate();
  const open = (area: 'events' | 'activities' | 'people' | 'initiatives') => { go(`community.${area}`, { id: String(id) }); };
  const [now] = useState(() => Date.now());

  const load = useCallback(() => {
    getCommunity(String(id))
      .then((x) => {
        setFailed(false);
        setData(x);
      })
      .catch(() => setFailed(true));
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

  const toggleShare = async (on: boolean) => {
    setRuleError(null);
    try {
      await shareWithFamily(String(id), on);
      setData((d) => (d ? { ...d, my_share: on } : d));
    } catch {
      setRuleError(t('rules.err_failed'));
    }
  };
  const leave = async () => {
    setRuleError(null);
    try {
      await leaveCommunity(String(id));
      go('connect.index');
    } catch (e) {
      setRuleError(e instanceof ApiError && e.code === 'last_lead' ? t('rules.err_last_lead') : t('rules.err_failed'));
    }
  };

  const when = (iso: string) => new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const ago = (iso: string) => {
    // Read once per mount: reading the clock on every render would be impure (the words could change underneath the compiler).
    const mins = Math.round((new Date(iso).getTime() - now) / 60000);
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    const abs = Math.abs(mins);
    return abs < 60 ? rtf.format(mins, 'minute') : abs < 1440 ? rtf.format(Math.round(mins / 60), 'hour') : rtf.format(Math.round(mins / 1440), 'day');
  };
  const card = { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.sm } as const;

  // What the agent may read and press: this community as it is really showing - its name and members, what
  // is happening and the latest updates. Published only once the community has loaded, so `read` has no data
  // (and says so) instead of reporting an empty screen while it is still coming in. Every action here runs
  // this screen's own handler, so the agent acts through the screen.
  const shown: PageDataInput | null = data
    ? {
        values: [
          { label: w('heading'), value: data.community.name },
          { label: w('people'), value: t('common.members', { n: data.community.member_count }) },
          { label: t('rules.circle_ask'), value: t(`rules.circle_${data.community.circle}`) },
          { label: t('rules.audience_ask'), value: data.community.audience === 'men' ? t('rules.audience_men') : data.community.audience === 'women' ? t('rules.audience_women') : t('rules.audience_all') },
        ],
        images: data.community.cover_url ? [{ uri: data.community.cover_url, alt: data.community.name }] : [],
        lists: [
          {
            label: w('happening'),
            items: data.activities.slice(0, 3).map((a, i) => ({
              label: a.title,
              detail: [when(a.starts_at), a.location].filter(Boolean).join(' · '),
              image: a.image_url ? { uri: a.image_url, alt: a.title } : undefined,
              actions: [{ id: `going${i + 1}`, label: a.title, run: () => toggle(a.id, a.i_going) }],
            })),
          },
          {
            label: w('updates'),
            items: data.announcements.slice(0, 3).map((u) => ({
              label: u.title,
              detail: [u.author, ago(u.created_at)].filter(Boolean).join(' · '),
            })),
          },
        ],
        actions: [
          { id: 'events', label: w('events'), run: () => open('events') },
          { id: 'activities', label: w('activities'), run: () => open('activities') },
          { id: 'people', label: w('people'), run: () => open('people') },
          { id: 'initiatives', label: w('initiatives'), run: () => open('initiatives') },
        ],
      }
    : null;
  usePageData(page, shown);

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
        <SkeletonPage banner tiles cards={3} />
      </Screen>
    );
  }
  const c = data.community;
  const next = data.activities.slice(0, 3);
  const updates = data.announcements.slice(0, 3);

  return (
    <Screen title={c.name} back>
      <El page={page} id="heading"><Text style={[type.small, { color: colors.muted, marginBottom: space.md }]}>{w('yourCommunity')}</Text></El>

      <View style={{ height: 160, borderRadius: radius.card, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentLine, justifyContent: 'flex-end', marginBottom: space.md, overflow: 'hidden' }}>
        {c.cover_url ? <Image source={{ uri: c.cover_url }} accessibilityIgnoresInvertColors style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" /> : <Ionicons name="business" size={72} color={colors.accent} style={{ position: 'absolute', right: 16, top: 14, opacity: 0.2 }} />}
        {c.cover_url ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80, backgroundColor: 'rgba(0,0,0,0.45)' }} /> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: c.cover_url ? '#FFFFFF' : colors.ink }}>{c.name}</Text>
            <Text style={[type.small, { color: c.cover_url ? '#FFFFFF' : colors.muted }]}>{[c.area_name, t('common.members', { n: c.member_count })].filter(Boolean).join(' · ')}</Text>
          </View>
        </View>
      </View>

      {/* Who this circle is for, what brings it together, and (for one brought in from a host) where it came from. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginBottom: space.md }}>
        <Pill text={c.audience === 'men' ? t('rules.audience_men') : c.audience === 'women' ? t('rules.audience_women') : t('rules.audience_all')} />
        <Text style={[type.small, { color: colors.muted }]}>{t(`rules.circle_${c.circle}`)}</Text>
        {c.source === 'imported' && c.host_name ? <Text style={[type.small, { color: colors.muted }]}>{t('rules.brought_in', { host: c.host_name })}</Text> : null}
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {AREAS.map((a) => (
          <View key={a.id} style={{ flex: 1 }}>
            <El page={page} id={a.id}>
              <Pressable onPress={() => open(a.id)} accessibilityRole="button" style={{ alignItems: 'center', gap: 6, paddingVertical: space.sm, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}>
                <Ionicons name={a.icon} size={24} color={colors.accent} />
                <Text style={[type.small, { color: colors.ink }]} numberOfLines={1}>{w(a.id)}</Text>
              </Pressable>
            </El>
          </View>
        ))}
      </View>

      {c.signature_product ? (
        <View style={[card, { marginTop: space.lg, gap: 2 }]}>
          <Text style={[type.small, { color: colors.muted }]}>{t('lead.product_title')}</Text>
          <Text style={{ fontSize: 22, fontWeight: '600', color: colors.ink }}>{c.signature_product}</Text>
          {c.meeting ? <Text style={[type.small, { color: colors.muted }]}>{c.meeting}</Text> : null}
        </View>
      ) : null}
      {data.can_manage ? <View style={{ marginTop: space.md }}><Button label={t('lead.lead_link')} kind="plain" icon="ribbon-outline" onPress={() => go('community.lead', { id: String(id) })} /></View> : null}

      <StandingCard communityId={String(id)} />

      <El page={page} id="happening"><Text style={[type.h2, { color: colors.ink, marginTop: space.lg, marginBottom: space.sm }]}>{w('happening')}</Text></El>
      {next.length ? next.map((a, i) => (
        <View key={a.id} style={[card, { flexDirection: 'row', alignItems: 'center', gap: space.md }]}>
          <Pressable onPress={() => go('community.event', { id: String(id), eid: a.id })} accessibilityRole="button" accessibilityLabel={a.title} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          {a.image_url ? (
            <Image source={{ uri: a.image_url }} accessibilityIgnoresInvertColors style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.accentSoft }} />
          ) : (
            <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="calendar" size={26} color={colors.accent} />
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{a.title}</Text>
            <Text style={[type.small, { color: colors.muted }]}>{when(a.starts_at)}</Text>
            {a.location ? <Text style={[type.small, { color: colors.muted }]}>{a.location}</Text> : null}
          </View>
          </Pressable>
          <El page={page} id={`going${i + 1}`}>
            <Pressable onPress={() => void toggle(a.id, a.i_going)} accessibilityRole="button" style={{ minWidth: 72, minHeight: 44, borderRadius: radius.button, backgroundColor: a.i_going ? colors.accent : colors.accentSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: a.i_going ? '#FFFFFF' : colors.accent }}>{a.i_going ? w('going') : w('join')}</Text>
            </Pressable>
          </El>
        </View>
      )) : <Text style={[type.body, { color: colors.muted, marginBottom: space.sm }]}>{w('noHappening')}</Text>}

      <El page={page} id="updates"><Text style={[type.h2, { color: colors.ink, marginTop: space.md, marginBottom: space.sm }]}>{w('updates')}</Text></El>
      {updates.length ? updates.map((u) => (
        <Pressable key={u.id} onPress={() => go('community.update', { id: String(id), uid: u.id })} accessibilityRole="button" style={card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Ionicons name={u.pinned ? 'pin' : 'megaphone-outline'} size={20} color={colors.accent} />
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink }}>{u.title}</Text>
            <Text style={[type.small, { color: colors.muted }]}>{ago(u.created_at)}</Text>
          </View>
          <Text style={[type.body, { color: colors.ink, marginTop: space.xs }]} numberOfLines={3}>{u.body}</Text>
          {u.author ? <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>{u.author}</Text> : null}
        </Pressable>
      )) : <Text style={[type.body, { color: colors.muted }]}>{w('noUpdates')}</Text>}

      <View style={{ marginTop: space.lg, gap: space.lg }}>
        <VoteCard cid={String(id)} lead={false} t={t} />
        <RotaCard cid={String(id)} lead={false} t={t} lang={lang} />
      </View>

      {data.activities.some((a) => (a.category ?? '').trim().toLowerCase() === 'market') ? (
        <View style={{ marginTop: space.md }}>
          {data.activities.filter((a) => (a.category ?? '').trim().toLowerCase() === 'market').map((a) => (
            <Button key={a.id} label={`${t('rules.stalls_link')} · ${a.title}`} kind="plain" icon="storefront-outline" onPress={() => go('market.stall', { id: a.id })} />
          ))}
        </View>
      ) : null}

      {data.family_here && data.family_here.length ? (
        <View style={[card, { marginTop: space.lg, backgroundColor: colors.accentSoft, borderColor: colors.accentLine }]}>
          <Text style={[type.h2, { color: colors.ink }]}>{t('rules.family_here_title')}</Text>
          <Text style={[type.body, { color: colors.ink, marginTop: space.xs }]}>{data.family_here.map((f) => f.name || '').filter(Boolean).join(', ') || t('rules.family_here_n', { n: data.family_here.length })}</Text>
        </View>
      ) : null}

      <View style={[card, { marginTop: space.md }]}>
        <Text style={[type.h2, { color: colors.ink }]}>{t('rules.share_label')}</Text>
        <Text style={[type.small, { color: colors.muted, marginVertical: space.xs }]}>{data.my_share ? t('rules.share_on') : t('rules.share_off')}</Text>
        <Button label={data.my_share ? t('rules.share_off') : t('rules.share_label')} kind={data.my_share ? 'plain' : 'primary'} onPress={() => void toggleShare(!data.my_share)} />
      </View>
      {ruleError ? <Text style={[type.small, { color: colors.danger, fontWeight: '600', marginBottom: space.sm }]}>{ruleError}</Text> : null}
      <Button label={t('rules.leave_c')} kind="danger" icon="exit-outline" onPress={() => void leave()} />
    </Screen>
  );
}
