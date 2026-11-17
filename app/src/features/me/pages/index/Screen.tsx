import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { getMyCommunities, type MyCommunity } from '../../../../api/communities';
import { getCard, type HealthCard } from '../../../../api/health';
import { getMyHosts } from '../../../../api/hosts';
import { BackScreen } from '../../../../components/BackButton';
import { Row, Field, Button } from '../../../../components/ui';
import { ChipRow } from '../../../../components/blocks';
import { getOnboarding, getTeachingProfile, putOnboarding } from '../../../../api/wisdom';
import { api } from '../../../../api/client';
import { useStore } from '../../../../core/store';
import { LANGUAGES, useLanguage, useT } from '../../../../i18n';
import { El, useAction, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { prefs, setPref } from '../../../../prefs/store';
import { reloadUser, sessionStore, signOut } from '../../../../session/store';
import { colors, space } from '../../../../theme/tokens';
import '../../moreWords'; // registers the words of the More list
import '../../profileWords'; // registers the words of the More sections
import '../../detailWords'; // registers the words of the profile page (pf.*)
import { meIndex as page } from './page';

type More = 'communities' | 'health' | 'numbers' | 'settings';
const box = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 16 } as const;
const LINE = '#EDE6DA';

// Numbers worth having at hand. They are public, national numbers: pressing Call only opens the phone's dialler (the person makes the call); the app never calls for them.
const NUMBERS: { group: 'prof.sg' | 'prof.in_'; items: { word: string; tel: string }[] }[] = [
  { group: 'prof.sg', items: [{ word: 'prof.n_amb_fire', tel: '995' }, { word: 'prof.n_police', tel: '999' }, { word: 'prof.n_non_emerg', tel: '1777' }, { word: 'prof.n_sos', tel: '1767' }] },
  { group: 'prof.in_', items: [{ word: 'prof.n_in_all', tel: '112' }, { word: 'prof.n_in_amb', tel: '108' }, { word: 'prof.n_police', tel: '100' }, { word: 'prof.n_elderline', tel: '14567' }] },
];

// The profile page (revamp v2, A3): one simple column. The profile card (photo or initials, the name, how they signed in); Your details, one big row
// per thing onboarding asks, each showing the saved value in words and opening its own edit screen (me.field), then the older details; Sign out,
// which asks first; and More (the same things as before: communities, health, emergency numbers, messages and check-in, and the other pages).
export default function Me() {
  const w = usePageWords(page);
  const t = useT();
  const go = useNavigate();
  const code = useLanguage();
  const { user: own, actingUser, status } = useStore(sessionStore);
  const user = actingUser ?? own; // while helping a family member, their details are shown
  const { textSize } = useStore(prefs);
  const [open, setOpen] = useState<More | null>(null);
  const [asking, setAsking] = useState(false);
  const [communities, setCommunities] = useState<MyCommunity[] | null>(null);
  const [card, setCard] = useState<HealthCard | null>(null);
  const [remind, setRemind] = useState<string | null>(null);
  const [shareLine, setShareLine] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const notSet = t('common.notSet');
  const ob = (k: string) => t(`onboarding.index.${k}`);

  useEffect(() => {
    if (status !== 'in') return; // after a reload the saved sign-in loads first
    let live = true;
    void reloadUser().catch(() => undefined); // the latest details, and how they signed in
    getMyCommunities().then((c) => { if (live) setCommunities(c); }).catch(() => { if (live) setCommunities([]); });
    getCard().then((c) => { if (live) setCard(c); }).catch(() => { if (live) setCard(null); });
    getOnboarding().then((st) => {
      const a = st.sections.find((x) => x.id === 'channels')?.questions.find((q) => q.key === 'preferred_channel')?.answer;
      if (live) setRemind(typeof a === 'string' ? a : null);
    }).catch(() => undefined);
    getTeachingProfile().then((p) => { if (live) setShareLine(p.expertise || null); }).catch(() => undefined);
    getMyHosts().then((h) => { if (live) setIsHost(h.length > 0); }).catch(() => undefined); // host members and platform admins only
    return () => { live = false; };
  }, [status]);

  const askOut = () => setAsking(true);
  const out = async () => { setAsking(false); await signOut(); go('auth.welcome', {}, { replace: true }); };
  useAction(page, 'signOut', askOut);
  useAction(page, 'signOutYes', () => void out());
  useAction(page, 'editProfile', () => go('me.field', { field: 'name' }));
  useAction(page, 'chooseLanguage', () => go('me.field', { field: 'language' }));

  const initials = (user?.display_name ?? user?.email ?? '?').trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');
  const via = own?.signed_in_with;
  const sizeWord = textSize === 'normal' ? ob('o_size_small') : textSize === 'larger' ? ob('o_size_large') : ob('o_size_normal');
  const remindWord = remind === 'app' ? ob('o_rem_app') : remind === 'call' ? ob('o_rem_call') : remind === 'whatsapp' ? ob('o_rem_wa') : remind ? remind : notSet;
  const likes = (user?.interests ?? []).map((k) => ob(`interest_${k}`)).join(', ');
  type Detail = { id: string; field?: string; icon: keyof typeof Ionicons.glyphMap; label: string; value: string; to?: () => void };
  const details: Detail[] = [
    { id: 'language', field: 'language', icon: 'language-outline', label: t('pf.language'), value: LANGUAGES.find((l) => l.code === code)?.native ?? code },
    { id: 'textSize', field: 'textSize', icon: 'text-outline', label: t('pf.text_size'), value: sizeWord },
    { id: 'name', field: 'name', icon: 'person-outline', label: t('pf.name'), value: user?.display_name || notSet },
    { id: 'area', field: 'area', icon: 'location-outline', label: t('pf.area'), value: user?.area_name || notSet },
    { id: 'enjoy', field: 'enjoy', icon: 'heart-outline', label: t('pf.enjoy'), value: likes || notSet },
    { id: 'voice', field: 'voice', icon: 'mic-outline', label: t('pf.voice'), value: user?.voice_intro_url ? t('pf.voice_yes') : t('pf.voice_no') },
    { id: 'reminders', field: 'reminders', icon: 'notifications-outline', label: t('pf.reminders'), value: remindWord },
    { id: 'share', icon: 'school-outline', label: t('pf.share'), value: shareLine || notSet, to: () => go('wisdom.teachProfile') },
  ];
  const older: Detail[] = [
    { id: 'age', field: 'age', icon: 'people-outline', label: t('pf.age'), value: user?.age_band ? t(`pf.age_${user.age_band}`) : notSet },
    { id: 'phone', field: 'phone', icon: 'call-outline', label: t('pf.phone'), value: user?.phone || notSet },
    { id: 'spoken', icon: 'chatbubbles-outline', label: t('pf.spoken'), value: (user?.spoken_languages ?? []).map((c) => LANGUAGES.find((l) => l.code === c)?.native ?? c).join(', ') || notSet, to: () => go('language.spoken') },
  ];
  const openRow = (d: Detail): void => { if (d.to) d.to(); else go('me.field', { field: d.field ?? 'name' }); };
  usePageData(page, {
    values: [...details, ...older].map((d) => ({ label: d.label, value: d.value })).concat(user?.email ? [{ label: t('pf.email'), value: user.email }] : []),
    images: [],
    lists: [],
    actions: [...details, ...older].map((d) => ({ id: `open${d.id.charAt(0).toUpperCase()}${d.id.slice(1)}`, label: `${d.label}: ${d.value}`, run: () => openRow(d) })),
  });

  const row = (d: Detail) => (
    <Pressable key={d.id} onPress={() => openRow(d)} accessibilityRole="button" accessibilityLabel={`${d.label}: ${d.value}`}
      style={({ pressed }) => ({ minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.85 : 1 })}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.navySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={d.icon} size={22} color={colors.ink} accessible={false} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: '#4A5361' }}>{d.label}</Text>
        <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink }}>{d.value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#6B7280" accessible={false} />
    </Pressable>
  );
  const section = (id: More, label: string, icon: keyof typeof Ionicons.glyphMap, body: ReactNode) => (
    <View key={id}>
      <Pressable onPress={() => setOpen((o) => (o === id ? null : id))} accessibilityRole="button" accessibilityState={{ expanded: open === id }}
        style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
        <Ionicons name={icon} size={22} color={colors.ink} accessible={false} />
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.ink }}>{label}</Text>
        <Ionicons name={open === id ? 'chevron-up' : 'chevron-down'} size={22} color="#6B7280" accessible={false} />
      </Pressable>
      {open === id ? <View style={{ paddingTop: space.md }}>{body}</View> : null}
    </View>
  );

  return (
    <BackScreen title={w('heading')} subtitle={t('common.onlyYou')}>
      <View style={{ alignItems: 'center', gap: 6, paddingVertical: space.lg, paddingHorizontal: space.md, marginBottom: space.lg, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
        <View style={{ width: 112, height: 112, borderRadius: 56, backgroundColor: colors.navySoft, borderWidth: 1, borderColor: '#CBD3E0', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 40, fontWeight: '700', color: '#15202E' }}>{initials}</Text>
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '800', color: colors.ink, marginTop: 6, textAlign: 'center' }}>{user?.display_name}</Text>
        {via ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            <Text style={{ fontSize: 17, color: '#4A5361' }}>{t(`pf.via_${via}`)}</Text>
            {via === 'singpass' ? <Image source={require('../../../../../assets/brand/singpass.png')} accessibilityLabel="Singpass" resizeMode="contain" style={{ width: 84, height: 15 }} /> : null}
          </View>
        ) : null}
        {user?.email && via !== 'singpass' && via !== 'demo' ? <Text style={{ fontSize: 16, color: '#4A5361' }}>{user.email}</Text> : null}
      </View>

      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>{t('pf.details')}</Text>
      <Text style={{ fontSize: 16, color: '#4A5361', marginBottom: space.sm }}>{t('pf.details_h')}</Text>
      <View style={{ gap: space.sm }}>{details.map(row)}</View>
      <Text accessibilityRole="header" style={{ fontSize: 19, fontWeight: '800', color: colors.ink, marginTop: space.lg, marginBottom: space.sm }}>{t('pf.older')}</Text>
      <View style={{ gap: space.sm }}>{older.map(row)}</View>

      <View style={{ marginTop: space.xl, gap: space.sm }}>
        {asking ? (
          <View accessibilityLiveRegion="polite" style={{ padding: space.md, borderRadius: 16, borderWidth: 2, borderColor: colors.danger, backgroundColor: colors.card, gap: space.sm }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink }}>{t('pf.sign_out_q')}</Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Pressable onPress={() => setAsking(false)} accessibilityRole="button" style={{ flex: 1, minHeight: 56, borderRadius: 14, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink }}>{t('pf.no')}</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <El page={page} id="signOutYes">
                  <Pressable onPress={() => void out()} accessibilityRole="button" style={{ minHeight: 56, borderRadius: 14, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>{t('pf.yes_out')}</Text>
                  </Pressable>
                </El>
              </View>
            </View>
          </View>
        ) : (
          <El page={page} id="signOut">
            <Pressable onPress={askOut} accessibilityRole="button" style={{ minHeight: 60, borderRadius: 16, borderWidth: 2, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
              <Ionicons name="log-out-outline" size={22} color={colors.danger} accessible={false} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.danger }}>{t('pf.sign_out')}</Text>
            </Pressable>
          </El>
        )}
        <Text style={{ fontSize: 15, color: '#5A6472', textAlign: 'center' }}>{t('prof.sign_out_note')}</Text>
      </View>

      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: space.xl, marginBottom: space.sm }}>{t('pf.more')}</Text>
      <View style={{ gap: space.sm, marginBottom: space.xl }}>
        {section('communities', t('pf.communities'), 'people-outline', (
          <View style={{ gap: space.sm }}>
            <View style={box}>
              {communities && communities.length === 0 ? <Text style={{ paddingVertical: 16, fontSize: 16, color: '#4A5361' }}>{t('prof.none_yet')}</Text> : null}
              {(communities ?? []).map((c, i, all) => (
                <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 14, borderBottomWidth: i < all.length - 1 ? 1 : 0, borderColor: LINE }}>
                  <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: colors.ink }}>{c.name}</Text>
                  <View style={{ backgroundColor: c.my_role === 'Member' ? colors.navySoft : '#FEF3C7', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: c.my_role === 'Member' ? '#15202E' : '#92400E' }}>{c.my_role}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={box}>
              <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: LINE }}>
                <Text style={{ fontWeight: '600', color: colors.ink }}>{t('prof.role_member')}</Text>
                <Text style={{ fontSize: 15, color: '#4A5361' }}>{t('prof.role_member_d')}</Text>
              </View>
              <View style={{ paddingVertical: 12 }}>
                <Text style={{ fontWeight: '600', color: colors.ink }}>{t('prof.role_lead')}</Text>
                <Text style={{ fontSize: 15, color: '#4A5361' }}>{t('prof.role_lead_d')}</Text>
              </View>
            </View>
          </View>
        ))}
        {section('health', t('pf.health'), 'fitness-outline', (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Tile label={t('prof.blood')} value={card?.blood_group ?? notSet} big />
              <Tile label={t('prof.allergies')} value={card?.allergies || notSet} />
            </View>
            <View style={box}>
              <Line k={t('prof.conditions')} v={card?.conditions || notSet} border />
              <Line k={t('prof.medicines')} v={card?.medicines || notSet} />
            </View>
            <Wide label={t('prof.edit_info')} onPress={() => go('health.card')} />
            <Text style={{ fontSize: 15, color: '#5A6472' }}>{t('prof.only_you')}</Text>
            <View style={box}>
              <Link label={t('prof.checkin_walks')} onPress={() => go('health.index')} line />
              <Link label={t('prof.walk_history')} onPress={() => go('health.history')} line />
              <Link label={t('prof.get_help')} onPress={() => go('health.help')} />
            </View>
          </View>
        ))}
        {section('numbers', t('pf.numbers'), 'call-outline', (
          <View style={{ gap: 12 }}>
            {card?.contact_phone ? (
              <>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.ink }} accessibilityRole="header">{t('prof.my_contact')}</Text>
                <View style={box}><NumberRow name={card.contact_name || card.contact_phone} tel={card.contact_phone} call={t('prof.call')} /></View>
              </>
            ) : null}
            {NUMBERS.map((g) => (
              <View key={g.group} style={{ gap: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.ink }} accessibilityRole="header">{t(g.group)}</Text>
                <View style={box}>
                  {g.items.map((n, i) => <NumberRow key={n.word + n.tel} name={t(n.word)} tel={n.tel} call={t('prof.call')} border={i < g.items.length - 1} />)}
                </View>
              </View>
            ))}
            <Text style={{ fontSize: 15, color: '#5A6472' }}>{t('prof.dialler')}</Text>
          </View>
        ))}
        {section('settings', t('pf.settings'), 'settings-outline', <Settings t={t} go={go} />)}
        <Row icon="today-outline" label="" value={t('home.index.tab')} onPress={() => go('home.index')} />
        <Row icon="notifications-outline" label="" value={t('channels.notices.heading')} onPress={() => go('channels.notices')} />
        <Row icon="chatbubbles-outline" label="" value={t('channels.chats.heading')} onPress={() => go('channels.chats')} />
        <Row icon="people-circle-outline" label="" value={t('menu.family')} onPress={() => go('family.home')} />
        {isHost ? <Row icon="storefront-outline" label="" value={t('host.home.heading')} onPress={() => go('host.home')} /> : null}
        <Row icon="calendar-outline" label="" value={t('menu.calendar')} onPress={() => go('calendar.today')} />
        <Row icon="sparkles-outline" label="" value={t('menu.aspirations')} onPress={() => go('grow.aspirations')} />
        <Row icon="hand-left-outline" label="" value={t('menu.contributions')} onPress={() => go('grow.contributions')} />
        <Row icon="fitness-outline" label="" value={t('menu.activity')} onPress={() => go('grow.activity')} />
        <Row icon="compass-outline" label="" value={t('menu.library')} onPress={() => go('explore.home')} />
        {__DEV__ ? <Row icon="code-slash" label="" value="Agent test console (developer)" onPress={() => go('dev.console')} /> : null}
      </View>
    </BackScreen>
  );
}

function Settings({ t, go }: { t: (k: string) => string; go: (k: string) => void }) {
  const { readAloud } = useStore(prefs);
  const [reachChannel, setReachChannel] = useState<string | null>(null);
  const [quietFrom, setQuietFrom] = useState('');
  const [quietTo, setQuietTo] = useState('');
  const [reachBusy, setReachBusy] = useState(false);
  const [reachMsg, setReachMsg] = useState<string | null>(null);
  const [checkinOn, setCheckinOn] = useState<boolean | null>(null);
  const [checkinTime, setCheckinTime] = useState('09:00');
  const [checkinFamily, setCheckinFamily] = useState<'no' | 'yes'>('no');
  const [checkinMsg, setCheckinMsg] = useState<string | null>(null);
  const w = usePageWords(page);
  useEffect(() => {
    getOnboarding().then((st) => {
      const c = st.sections.find((s) => s.id === 'channels');
      const a: Record<string, unknown> = {};
      (c?.questions ?? []).forEach((q: any) => { if (q.answer != null) a[q.key] = q.answer; });
      if (typeof a.preferred_channel === 'string') setReachChannel(a.preferred_channel as string);
      if (typeof a.quiet_from === 'string') setQuietFrom(a.quiet_from as string);
      if (typeof a.quiet_to === 'string') setQuietTo(a.quiet_to as string);
    }).catch(() => undefined);
    api('GET', '/v1/onboarding/checkin').then((r: any) => { setCheckinOn(!!r.enabled); if (r.time) setCheckinTime(r.time); setCheckinFamily(r.family_notify ? 'yes' : 'no'); }).catch(() => setCheckinOn(false));
  }, []);
  const saveReach = async () => {
    setReachBusy(true); setReachMsg(null);
    try {
      const answers: Record<string, unknown> = {};
      if (reachChannel) answers.preferred_channel = reachChannel;
      if (quietFrom.trim() && quietTo.trim()) { answers.quiet_from = quietFrom.trim(); answers.quiet_to = quietTo.trim(); }
      else if (!quietFrom.trim() && !quietTo.trim()) { answers.quiet_from = null; answers.quiet_to = null; }
      else { setReachMsg(w('quietFrom')); setReachBusy(false); return; }
      await putOnboarding('channels', answers);
      setReachMsg(w('saved') || 'Saved');
    } catch { setReachMsg(w('failed') || 'Could not save'); }
    finally { setReachBusy(false); }
  };
  const toggleCheckin = async (on: boolean) => {
    setCheckinMsg(null);
    try {
      if (on) {
        const r: any = await api('POST', '/v1/skills/set_daily_checkin', { args: { time: checkinTime, family_notify: checkinFamily === 'yes', confirmed: true } });
        if (r?.error) { setCheckinMsg(w('checkinFailed') || 'Could not save'); return; }
        setCheckinOn(true);
      } else {
        await api('POST', '/v1/skills/stop_daily_checkin', { args: {} });
        setCheckinOn(false);
      }
    } catch { setCheckinMsg(w('checkinFailed') || 'Could not save'); }
  };
  return (
    <View style={{ gap: 12 }}>
      <View style={box}>
        <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: LINE, gap: 10 }}>
          <Text style={{ fontWeight: '600', color: colors.ink, fontSize: 16 }}>{w('reachChannel')}</Text>
          <ChipRow options={[{ value: 'call', label: t('prof.ch_call') || 'Phone call' }, { value: 'whatsapp', label: t('prof.ch_whatsapp') || 'WhatsApp' }, { value: 'telegram', label: t('prof.ch_telegram') || 'Telegram' }, { value: 'sms', label: t('prof.ch_sms') || 'Text message' }, { value: 'app', label: t('prof.ch_app') || 'The app' }]} value={reachChannel ?? ''} onChange={setReachChannel} />
        </View>
        <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: LINE, gap: 10 }}>
          <Text style={{ fontWeight: '600', color: colors.ink, fontSize: 16 }}>{w('quietFrom')} – {w('quietTo')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Field label={w('quietFrom')} value={quietFrom} onChangeText={setQuietFrom} placeholder="21:00" /></View>
            <View style={{ flex: 1 }}><Field label={w('quietTo')} value={quietTo} onChangeText={setQuietTo} placeholder="08:00" /></View>
          </View>
          <Pressable onPress={() => { setQuietFrom(''); setQuietTo(''); }}><Text style={{ fontSize: 14, color: colors.accent }}>{w('quietClear')}</Text></Pressable>
        </View>
        <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: LINE }}>
          <Button label={reachBusy ? '…' : w('reachSave')} onPress={() => void saveReach()} disabled={reachBusy} />
          {reachMsg ? <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>{reachMsg}</Text> : null}
        </View>
        <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: LINE, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: colors.ink, fontSize: 16 }}>{w('checkinSwitch')}</Text>
              <Text style={{ fontSize: 14, color: '#4A5361' }}>{w('checkinNote') || 'Interchange asks one gentle question each day.'}</Text>
            </View>
            <Pressable onPress={() => void toggleCheckin(!(checkinOn === true))} accessibilityRole="switch" accessibilityState={{ checked: checkinOn === true }} style={{ width: 52, height: 30, borderRadius: 999, padding: 3, backgroundColor: checkinOn === true ? colors.navy : '#CFC6B6', justifyContent: 'center', alignItems: checkinOn === true ? 'flex-end' : 'flex-start' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' }} />
            </Pressable>
          </View>
          {checkinOn === true ? (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, color: '#4A5361' }}>{w('checkinTime')}</Text>
              <ChipRow options={['07:00','08:00','09:00','10:00','12:00','18:00','19:00','20:00'].map((v) => ({ value: v, label: v }))} value={checkinTime} onChange={setCheckinTime} />
              <Text style={{ fontSize: 14, color: '#4A5361' }}>{w('checkinFamily')}</Text>
              <ChipRow options={[{ value: 'no', label: w('checkinFamilyNo') || 'No' }, { value: 'yes', label: w('checkinFamilyYes') || 'Yes, tell my family' }]} value={checkinFamily} onChange={(v) => setCheckinFamily(v as 'no' | 'yes')} />
            </View>
          ) : null}
          {checkinMsg ? <Text style={{ fontSize: 14, color: colors.danger, marginTop: 4 }}>{checkinMsg}</Text> : null}
        </View>
      </View>
      <View style={box}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: LINE }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', color: colors.ink, fontSize: 16 }}>{t('prof.read_aloud')}</Text>
            <Text style={{ fontSize: 15, color: '#4A5361' }}>{t('prof.read_aloud_d')}</Text>
          </View>
          <Pressable onPress={() => setPref({ readAloud: !readAloud })} accessibilityRole="switch" accessibilityLabel={t('prof.read_aloud')} accessibilityState={{ checked: readAloud }} style={{ width: 52, height: 30, borderRadius: 999, padding: 3, backgroundColor: readAloud ? colors.navy : '#CFC6B6', justifyContent: 'center', alignItems: readAloud ? 'flex-end' : 'flex-start' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' }} />
          </Pressable>
        </View>
        <Link label={t('prof.reminder_calls')} sub={t('prof.reminder_calls_d')} onPress={() => go('calendar.calls')} />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '600', color: colors.ink }} accessibilityRole="header">{t('prof.privacy')}</Text>
      <Text style={{ fontSize: 15, color: '#4A5361' }}>{t('prof.privacy_note')}</Text>
    </View>
  );
}

function Tile({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, gap: 4 }}>
      <Text style={{ fontSize: 15, color: '#4A5361' }}>{label}</Text>
      <Text style={{ fontSize: big ? 24 : 19, fontWeight: '600', color: colors.ink }}>{value}</Text>
    </View>
  );
}

function Line({ k, v, border }: { k: string; v: string; border?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: border ? 1 : 0, borderColor: LINE }}>
      <Text style={{ color: '#4A5361', fontSize: 16 }}>{k}</Text>
      <Text style={{ flex: 1, fontWeight: '600', color: colors.ink, textAlign: 'right', fontSize: 16 }}>{v}</Text>
    </View>
  );
}

function Wide({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#CFC6B6', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.ink }}>{label}</Text>
    </Pressable>
  );
}

function Link({ label, sub, onPress, line }: { label: string; sub?: string; onPress: () => void; line?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: line ? 1 : 0, borderColor: LINE }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 15, color: '#4A5361' }}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </Pressable>
  );
}

function NumberRow({ name, tel, call, border }: { name: string; tel: string; call: string; border?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: border ? 1 : 0, borderColor: LINE }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>{name}</Text>
        <Text style={{ fontSize: 15, color: '#4A5361' }}>{tel}</Text>
      </View>
      <Pressable onPress={() => void Linking.openURL(`tel:${tel}`)} accessibilityRole="button" accessibilityLabel={`${call} ${name} ${tel}`} style={{ minHeight: 44, minWidth: 84, borderRadius: 10, backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 }}>
        <Ionicons name="call" size={16} color="#FFFFFF" />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>{call}</Text>
      </Pressable>
    </View>
  );
}
