import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { ApiError } from '../../../../api/client';
import { getCommunity, type CommunityDetail } from '../../../../api/communities';
import { communityAbout, leaveCommunity, saveCommunityDetails, shareWithFamily, type AboutEvent, type CommunityCard as Card, type InterestKey } from '../../../../api/communityRules';
import { fileReport, type ReportReason } from '../../../../api/safety';
import { Pill } from '../../../../components/blocks';
import { MapCard } from '../../../../components/MapCard';
import { SkeletonPage } from '../../../../components/Skeleton';
import { Button, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useLanguage, useT } from '../../../../i18n';
import { El, useAction, usePageData, usePageWords, type PageDataInput } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { Faces } from '../../../connect/CommunityCard';
import { communityPhoto } from '../../../connect/photos';
import '../../../connect/revampWords'; // registers the words
import { useJoin } from '../../../connect/useJoin';
import { RotaCard, VoteCard } from '../../../lead/LeadBits';
import '../../../lead/leadWords'; // registers the words of the vote and the rota
import { DaysCard, PeopleCard, StoriesCard, TakePartCard } from '../../BelongingCards';
import { EventList } from '../../EventList';
import { StandingCard } from '../../StandingCard';
import { communityHome as page } from './page';

const WA_GREEN = '#1F8F4E';
const INTERESTS: InterestKey[] = ['walking', 'taichi', 'cooking', 'chess', 'music', 'gardening', 'teaching', 'tech'];
const AREAS: { id: 'events' | 'activities' | 'people' | 'initiatives'; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'events', icon: 'calendar-outline' },
  { id: 'activities', icon: 'layers-outline' },
  { id: 'people', icon: 'people-outline' },
  { id: 'initiatives', icon: 'leaf-outline' },
];
const REASONS: { id: ReportReason; word: string }[] = [
  { id: 'unsafe', word: 'reason_unsafe' }, { id: 'unkind', word: 'reason_unkind' }, { id: 'spam', word: 'reason_spam' }, { id: 'other', word: 'reason_other' },
];

function Action({ label, icon, onPress, tone }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; tone: 'whatsapp' | 'navy' | 'outline' | 'danger' }) {
  const bg = tone === 'whatsapp' ? WA_GREEN : tone === 'navy' ? colors.navy : tone === 'danger' ? colors.danger : colors.card;
  const fg = tone === 'outline' ? colors.navy : '#FFFFFF';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ flex: 1, minHeight: 56, borderRadius: radius.button, backgroundColor: bg, borderWidth: 2, borderColor: tone === 'outline' ? colors.navy : bg, opacity: pressed ? 0.85 : 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: space.md, paddingVertical: space.sm })}>
      <Ionicons name={icon} size={22} color={fg} />
      <Text style={{ flexShrink: 1, fontSize: 18, fontWeight: '700', color: fg, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

/** A sheet from the bottom of the screen: a title, a sentence, and big buttons. Closes with Close, a tap outside, or the device back button. */
function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} accessibilityLabel={t('rv.close')} style={{ flex: 1, backgroundColor: 'rgba(17,24,39,0.45)' }} />
      <View accessibilityViewIsModal style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: space.xl, gap: space.md }}>
        <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '800', color: colors.ink }}>{title}</Text>
        {children}
        <Pressable onPress={onClose} accessibilityRole="button" style={{ minHeight: 56, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.navy }}>{t('rv.close')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/** The leader keeps the group's details up to date: where it meets, its WhatsApp group link, its own events page, what it is about. */
function DetailsEditor({ c, onSaved }: { c: Card; onSaved: (c: Card) => void }) {
  const t = useT();
  const [address, setAddress] = useState(c.address ?? '');
  const [wa, setWa] = useState(c.whatsapp_url ?? '');
  const [url, setUrl] = useState(c.events_url ?? '');
  const [likes, setLikes] = useState<InterestKey[]>(c.interests);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const field = { minHeight: 56, borderRadius: radius.button, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: space.md, fontSize: 18, color: colors.ink } as const;
  const label = { fontSize: 18, fontWeight: '700' as const, color: colors.ink, marginTop: space.md, marginBottom: space.xs };
  const save = async () => {
    setMsg(null);
    try {
      const r = await saveCommunityDetails(c.id, { address: address.trim(), whatsapp_url: wa.trim(), events_url: url.trim(), interests: likes });
      onSaved(r.community);
      setMsg({ ok: true, text: t('rv.saved') });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : '';
      setMsg({ ok: false, text: code === 'bad_whatsapp_link' || code === 'validation' ? t('rv.bad_whatsapp') : code === 'bad_events_link' ? t('rv.bad_events') : t('rules.err_failed') });
    }
  };
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, marginTop: space.md }}>
      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>{t('rv.details_title')}</Text>
      <Text style={label}>{t('rv.details_address')}</Text>
      <TextInput value={address} onChangeText={setAddress} maxLength={200} accessibilityLabel={t('rv.details_address')} style={field} />
      <Text style={label}>{t('rv.details_whatsapp')}</Text>
      <TextInput value={wa} onChangeText={setWa} autoCapitalize="none" autoCorrect={false} placeholder="https://chat.whatsapp.com/..." placeholderTextColor={colors.muted} accessibilityLabel={t('rv.details_whatsapp')} style={field} />
      <Text style={{ fontSize: 16, lineHeight: 22, color: colors.muted, marginTop: space.xs }}>{t('rv.details_whatsapp_hint')}</Text>
      <Text style={label}>{t('rv.details_events')}</Text>
      <TextInput value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} placeholder="https://" placeholderTextColor={colors.muted} accessibilityLabel={t('rv.details_events')} style={field} />
      <Text style={label}>{t('rv.details_interests')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {INTERESTS.map((k) => {
          const on = likes.includes(k);
          return (
            <Pressable key={k} onPress={() => setLikes((l) => (on ? l.filter((x) => x !== k) : [...l, k]))} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
              style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 2, borderColor: on ? colors.navy : colors.line, backgroundColor: on ? colors.navy : colors.card }}>
              {on ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
              <Text style={{ fontSize: 17, fontWeight: '600', color: on ? '#FFFFFF' : colors.ink }}>{t(`rv.i_${k}`)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ marginTop: space.lg }}><Button label={t('rv.save')} icon="checkmark" onPress={() => void save()} /></View>
      {msg ? <Text accessibilityLiveRegion="polite" style={{ fontSize: 17, fontWeight: '600', color: msg.ok ? '#1F7A3F' : colors.danger, marginTop: space.sm }}>{msg.text}</Text> : null}
    </View>
  );
}

export default function CommunityHome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = String(id);
  const w = usePageWords(page);
  const t = useT();
  const lang = useLanguage();
  const { status } = useStore(sessionStore);
  const go = useNavigate();
  const [card, setCard] = useState<Card | null>(null);
  const [preview, setPreview] = useState<AboutEvent[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [data, setData] = useState<CommunityDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [longText, setLongText] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sheet, setSheet] = useState<'more' | 'leave' | 'report' | null>(null);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [ruleError, setRuleError] = useState<string | null>(null);

  const load = useCallback(() => {
    communityAbout(cid)
      .then(async (a) => {
        setCard(a.community);
        setPreview(a.events);
        setCanManage(a.can_manage);
        setFailed(false);
        setData(a.community.is_member ? await getCommunity(cid) : null);
      })
      .catch(() => setFailed(true));
  }, [cid]);
  useEffect(() => { if (status === 'in' && id) load(); }, [status, id, load]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timer);
  }, [toast]);
  const joiner = useJoin(useCallback(() => { load(); }, [load]));

  const open = (area: 'events' | 'activities' | 'people' | 'initiatives') => { go(`community.${area}`, { id: cid }); };
  const whatsapp = () => { if (card?.whatsapp_url) void Linking.openURL(card.whatsapp_url); };
  const leave = async () => {
    setRuleError(null);
    try {
      await leaveCommunity(cid);
      setSheet(null);
      setToast(t('rv.left', { name: card?.name ?? '' }));
      setTimeout(() => go('connect.index', {}, { replace: true }), 1400);
    } catch (e) {
      setRuleError(e instanceof ApiError && e.code === 'last_lead' ? t('rv.last_lead') : t('rules.err_failed'));
    }
  };
  const report = async (reason: ReportReason) => {
    try {
      await fileReport({ target_kind: 'community', target_id: cid, reason });
      setSheet(null);
      setToast(t('safety.index.thanks'));
    } catch {
      setRuleError(t('rules.err_failed'));
    }
  };
  const toggleShare = async (on: boolean) => {
    setRuleError(null);
    try {
      await shareWithFamily(cid, on);
      setData((d) => (d ? { ...d, my_share: on } : d));
    } catch {
      setRuleError(t('rules.err_failed'));
    }
  };
  useAction(page, 'join', () => { if (card && !card.is_member) void joiner.join(card); });
  useAction(page, 'whatsapp', whatsapp);
  useAction(page, 'more', () => setSheet('more'));
  useAction(page, 'leave', () => setSheet('leave'));

  const when = (iso: string) => new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const shown: PageDataInput | null = card
    ? {
        values: [
          { label: w('heading'), value: card.name },
          { label: w('people'), value: t('rv.members', { n: card.member_count }) },
          ...(card.leader_name ? [{ label: t('rv.lead_role', { name: '' }).replace(/[:：]\s*$/, ''), value: card.leader_name }] : []),
          ...(card.address ? [{ label: t('rv.where_we_meet'), value: card.address }] : []),
        ],
        images: card.cover_url ? [{ uri: card.cover_url, alt: card.name }] : [],
        lists: [{ label: w('comingUp'), items: (data?.activities ?? preview).slice(0, 5).map((a) => ({ label: a.title, detail: [when(a.starts_at), a.location].filter(Boolean).join(' · ') })) }],
        actions: [
          ...(card.is_member ? [] : [{ id: 'join', label: t('rv.join'), run: () => { void joiner.join(card); } }]),
          ...(card.whatsapp_url ? [{ id: 'whatsapp', label: t('rv.whatsapp'), run: whatsapp }] : []),
          ...(card.is_member ? [{ id: 'more', label: t('rv.more'), run: () => setSheet('more') }, { id: 'leave', label: t('rv.leave'), run: () => setSheet('leave') }] : []),
          { id: 'events', label: w('events'), run: () => open('events') },
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
  if (!card) {
    return (
      <Screen title={w('heading')} back>
        <SkeletonPage banner tiles cards={3} />
      </Screen>
    );
  }
  const c = card;
  const member = c.is_member;
  const box = { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.sm } as const;

  return (
    <Screen title={c.name} back>
      {/* the picture identifies the place, so it earns its space */}
      <Image source={communityPhoto(c)} accessibilityIgnoresInvertColors style={{ width: '100%', height: 190, borderRadius: radius.card, backgroundColor: colors.accentSoft }} resizeMode="cover" />

      <El page={page} id="heading"><Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, fontWeight: '800', color: colors.ink, marginTop: space.lg }}>{c.name}</Text></El>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
        <Pill text={c.audience === 'men' ? t('rules.audience_men') : c.audience === 'women' ? t('rules.audience_women') : t('rv.for_all')} />
        <Text style={{ fontSize: 17, color: colors.ink }}>{t(`rules.circle_${c.circle}`)}</Text>
      </View>
      {c.source === 'imported' && c.host_name ? <Text style={{ fontSize: 17, color: colors.ink, marginTop: space.xs }}>{t('rv.from_host', { host: c.host_name })}</Text> : null}

      {c.description ? (
        <View style={{ marginTop: space.md }}>
          <Text style={{ fontSize: 18, lineHeight: 27, color: colors.ink }} numberOfLines={longText ? undefined : 3}>{c.description}</Text>
          {c.description.length > 140 ? (
            <Pressable onPress={() => setLongText((x) => !x)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.navy, textDecorationLine: 'underline' }}>{longText ? t('rv.less_text') : t('rv.more_text')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* members, and who leads */}
      <Pressable onPress={member ? () => open('people') : undefined} disabled={!member} accessibilityRole={member ? 'button' : undefined}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.md, minHeight: 48 }}>
        {c.faces.length ? <Faces names={c.faces.map((f) => f.name)} /> : <Ionicons name="people" size={26} color={colors.muted} />}
        <Text style={{ flex: 1, fontSize: 18, color: colors.ink }}>{t('rv.members', { n: c.member_count })}</Text>
        {member ? <Ionicons name="chevron-forward" size={22} color={colors.muted} /> : null}
      </Pressable>
      {c.leader_name ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>{c.leader_name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 18, color: colors.ink }}>{t('rv.lead_role', { name: c.leader_name })}</Text>
          <Ionicons name="checkmark-circle" size={22} color={colors.navy} accessibilityLabel="" />
        </View>
      ) : null}

      {/* actions: one obvious thing to do */}
      <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
        {member ? (
          <>
            {c.whatsapp_url ? <El page={page} id="whatsapp"><Action tone="whatsapp" icon="logo-whatsapp" label={t('rv.whatsapp')} onPress={whatsapp} /></El>
              : canManage ? <Action tone="outline" icon="logo-whatsapp" label={t('rv.add_whatsapp')} onPress={() => setEditing(true)} /> : null}
            <El page={page} id="more"><Action tone="outline" icon="ellipsis-horizontal" label={t('rv.more')} onPress={() => setSheet('more')} /></El>
          </>
        ) : (
          <El page={page} id="join"><Action tone="navy" icon="add-circle-outline" label={t('rv.join')} onPress={() => void joiner.join(c)} /></El>
        )}
      </View>
      {joiner.askNode ? <View style={{ marginTop: space.md }}>{joiner.askNode}</View> : null}
      {joiner.error ? <Text accessibilityLiveRegion="polite" style={{ fontSize: 17, fontWeight: '600', color: colors.danger, marginTop: space.sm }}>{joiner.error}</Text> : null}
      {canManage ? (
        <Pressable onPress={() => setEditing((e) => !e)} accessibilityRole="button" style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
          <Ionicons name="create-outline" size={22} color={colors.navy} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.navy, textDecorationLine: 'underline' }}>{t('rv.details_title')}</Text>
        </Pressable>
      ) : null}
      {editing && canManage ? <DetailsEditor c={c} onSaved={(n) => setCard(n)} /> : null}

      {/* where we meet */}
      {c.address ? <View style={{ marginTop: space.lg }}><MapCard kind="community" id={c.id} address={c.address} title={t('rv.where_we_meet')} /></View> : null}

      {/* coming up */}
      <El page={page} id="comingUp"><Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: space.xl, marginBottom: space.md }}>{t('rv.coming_up')}</Text></El>
      <EventList cid={cid} member={member} preview={preview} eventsUrl={c.events_url} />

      {member && data ? (
        <>
          {/* the belonging layer, unchanged: the days we keep, who is away, taking part from where you are, our stories */}
          <DaysCard cid={cid} canManage={data.can_manage} w={(k, v) => w(k, v)} />
          <PeopleCard cid={cid} w={(k, v) => w(k, v)} />
          <TakePartCard cid={cid} w={(k, v) => w(k, v)} />
          <StoriesCard cid={cid} w={(k, v) => w(k, v)} />

          <Pressable onPress={() => setMoreOpen((x) => !x)} accessibilityRole="button" accessibilityState={{ expanded: moreOpen }}
            style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderRadius: radius.button, borderWidth: 2, borderColor: colors.navy, marginTop: space.xl }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.navy }}>{t('rv.more_about')}</Text>
            <Ionicons name={moreOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.navy} />
          </Pressable>
          {moreOpen ? (
            <View style={{ marginTop: space.lg }}>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                {AREAS.map((a) => (
                  <View key={a.id} style={{ flex: 1 }}>
                    <El page={page} id={a.id}>
                      <Pressable onPress={() => open(a.id)} accessibilityRole="button" style={{ minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: radius.button, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}>
                        <Ionicons name={a.icon} size={24} color={colors.accent} />
                        <Text style={{ fontSize: 15, color: colors.ink }} numberOfLines={1}>{w(a.id)}</Text>
                      </Pressable>
                    </El>
                  </View>
                ))}
              </View>
              {data.community.signature_product ? (
                <View style={[box, { marginTop: space.lg }]}>
                  <Text style={{ fontSize: 16, color: colors.muted }}>{t('lead.product_title')}</Text>
                  <Text style={{ fontSize: 22, fontWeight: '600', color: colors.ink }}>{data.community.signature_product}</Text>
                  {data.community.meeting ? <Text style={{ fontSize: 16, color: colors.muted }}>{data.community.meeting}</Text> : null}
                </View>
              ) : null}
              {data.can_manage ? <View style={{ marginTop: space.md }}><Button label={t('lead.lead_link')} kind="plain" icon="ribbon-outline" onPress={() => go('community.lead', { id: cid })} /></View> : null}
              <StandingCard communityId={cid} />
              <El page={page} id="updates"><Text style={[type.h2, { color: colors.ink, marginTop: space.lg, marginBottom: space.sm }]}>{w('updates')}</Text></El>
              {data.announcements.slice(0, 3).length ? data.announcements.slice(0, 3).map((u) => (
                <Pressable key={u.id} onPress={() => go('community.update', { id: cid, uid: u.id })} accessibilityRole="button" style={box}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Ionicons name={u.pinned ? 'pin' : 'megaphone-outline'} size={20} color={colors.accent} />
                    <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.ink }}>{u.title}</Text>
                  </View>
                  <Text style={[type.body, { color: colors.ink, marginTop: space.xs }]} numberOfLines={3}>{u.body}</Text>
                  {u.author ? <Text style={{ fontSize: 16, color: colors.muted, marginTop: space.xs }}>{u.author}</Text> : null}
                </Pressable>
              )) : <Text style={[type.body, { color: colors.muted }]}>{w('noUpdates')}</Text>}
              <View style={{ marginTop: space.lg, gap: space.lg }}>
                <VoteCard cid={cid} lead={false} t={t} />
                <RotaCard cid={cid} lead={false} t={t} lang={lang} />
              </View>
              {data.activities.some((a) => (a.category ?? '').trim().toLowerCase() === 'market') ? (
                <View style={{ marginTop: space.md }}>
                  {data.activities.filter((a) => (a.category ?? '').trim().toLowerCase() === 'market').map((a) => (
                    <Button key={a.id} label={`${t('rules.stalls_link')} · ${a.title}`} kind="plain" icon="storefront-outline" onPress={() => go('market.stall', { id: a.id })} />
                  ))}
                </View>
              ) : null}
              {data.family_here && data.family_here.length ? (
                <View style={[box, { marginTop: space.lg, backgroundColor: colors.accentSoft, borderColor: colors.accentLine }]}>
                  <Text style={[type.h2, { color: colors.ink }]}>{t('rules.family_here_title')}</Text>
                  <Text style={[type.body, { color: colors.ink, marginTop: space.xs }]}>{data.family_here.map((f) => f.name || '').filter(Boolean).join(', ') || t('rules.family_here_n', { n: data.family_here.length })}</Text>
                </View>
              ) : null}
              <View style={[box, { marginTop: space.md }]}>
                <Text style={[type.h2, { color: colors.ink }]}>{t('rules.share_label')}</Text>
                <Text style={{ fontSize: 16, color: colors.muted, marginVertical: space.xs }}>{data.my_share ? t('rules.share_on') : t('rules.share_off')}</Text>
                <Button label={data.my_share ? t('rules.share_off') : t('rules.share_label')} kind={data.my_share ? 'plain' : 'primary'} onPress={() => void toggleShare(!data.my_share)} />
              </View>
            </View>
          ) : null}
        </>
      ) : null}
      {ruleError ? <Text accessibilityLiveRegion="polite" style={{ fontSize: 17, color: colors.danger, fontWeight: '600', marginTop: space.md }}>{ruleError}</Text> : null}

      {/* More: share the invite, report, leave */}
      <Sheet open={sheet === 'more'} onClose={() => setSheet(null)} title={c.name}>
        <Action tone="outline" icon="share-outline" label={t('rv.share_invite')} onPress={() => { setSheet(null); go('community.invite', { id: cid }); }} />
        <Action tone="outline" icon="flag-outline" label={t('rv.report')} onPress={() => setSheet('report')} />
        <El page={page} id="leave"><Action tone="danger" icon="exit-outline" label={t('rv.leave')} onPress={() => setSheet('leave')} /></El>
      </Sheet>
      <Sheet open={sheet === 'leave'} onClose={() => setSheet(null)} title={t('rv.leave_title', { name: c.name })}>
        <Text style={{ fontSize: 18, lineHeight: 26, color: colors.ink }}>{t('rv.leave_body')}</Text>
        <Action tone="danger" icon="exit-outline" label={t('rv.leave')} onPress={() => void leave()} />
        <Action tone="outline" icon="heart-outline" label={t('rv.stay')} onPress={() => setSheet(null)} />
        {ruleError ? <Text style={{ fontSize: 17, color: colors.danger, fontWeight: '600' }}>{ruleError}</Text> : null}
      </Sheet>
      <Sheet open={sheet === 'report'} onClose={() => setSheet(null)} title={t('rv.report_title')}>
        {REASONS.map((r) => <Action key={r.id} tone="outline" icon="chevron-forward" label={t(`safety.index.${r.word}`)} onPress={() => void report(r.id)} />)}
      </Sheet>

      {/* a short green note at the top of the screen, then it goes by itself */}
      <Modal visible={!!toast} transparent animationType="fade" onRequestClose={() => setToast(null)}>
        <View style={{ paddingTop: 56, paddingHorizontal: space.lg }}>
          <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: '#1F7A3F', borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.md }}>
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>{toast}</Text>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
