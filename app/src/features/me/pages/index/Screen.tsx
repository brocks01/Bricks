import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { getMyCommunities, type MyCommunity } from '../../../../api/communities';
import { getCard, type HealthCard } from '../../../../api/health';
import { BackScreen } from '../../../../components/BackButton';
import { Row, Field, Button } from '../../../../components/ui';
import { ChipRow } from '../../../../components/blocks';
import { getOnboarding, putOnboarding } from '../../../../api/wisdom';
import { api } from '../../../../api/client';
import { useStore } from '../../../../core/store';
import { LANGUAGES, useLanguage, useT } from '../../../../i18n';
import { El, useAction, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { prefs, setPref, type TextSize } from '../../../../prefs/store';
import { sessionStore, signOut } from '../../../../session/store';
import { colors, space } from '../../../../theme/tokens';
import '../../moreWords'; // registers the words of the More list
import '../../profileWords'; // registers the words of the tabs
import { meIndex as page } from './page';

type Tab = 'me' | 'health' | 'numbers' | 'settings';
const box = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 16 } as const;
const LINE = '#EDE6DA';

// Numbers worth having at hand. They are public, national numbers: pressing Call only opens the phone's dialler (the person makes the call); the app never calls for them.
const NUMBERS: { group: 'prof.sg' | 'prof.in_'; items: { word: string; tel: string }[] }[] = [
  { group: 'prof.sg', items: [{ word: 'prof.n_amb_fire', tel: '995' }, { word: 'prof.n_police', tel: '999' }, { word: 'prof.n_non_emerg', tel: '1777' }, { word: 'prof.n_sos', tel: '1767' }] },
  { group: 'prof.in_', items: [{ word: 'prof.n_in_all', tel: '112' }, { word: 'prof.n_in_amb', tel: '108' }, { word: 'prof.n_police', tel: '100' }, { word: 'prof.n_elderline', tel: '14567' }] },
];

// Me = the person's own details, health, important numbers and settings, in four tabs like the owner's design. Everything shown comes from their account.
export default function Me() {
  const w = usePageWords(page);
  const t = useT();
  const go = useNavigate();
  const code = useLanguage();
  const { user: own, actingUser } = useStore(sessionStore);
  const user = actingUser ?? own; // while helping a family member, their details are shown
  const [tab, setTab] = useState<Tab>('me');
  const [communities, setCommunities] = useState<MyCommunity[] | null>(null);
  const [card, setCard] = useState<HealthCard | null>(null);
  const current = LANGUAGES.find((l) => l.code === code);
  const notSet = t('common.notSet');
  useAction(page, 'editProfile', () => go('me.edit'));
  useAction(page, 'chooseLanguage', () => go('language.pick'));
  useAction(page, 'signOut', signOut);
  useEffect(() => {
    getMyCommunities().then(setCommunities).catch(() => setCommunities([]));
    getCard().then(setCard).catch(() => setCard(null));
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'me', label: t('prof.tab_me') },
    { id: 'health', label: t('prof.tab_health') },
    { id: 'numbers', label: t('prof.tab_numbers') },
    { id: 'settings', label: t('prof.tab_settings') },
  ];
  const initials = (user?.display_name ?? user?.email ?? '?').trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('');

  return (
    <BackScreen title={w('heading')} subtitle={t('common.onlyYou')}>
      <View style={{ alignItems: 'center', gap: 6, paddingVertical: space.md }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.navySoft, borderWidth: 1, borderColor: '#CBD3E0', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 30, fontWeight: '600', color: '#15202E' }}>{initials}</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '600', color: colors.ink, marginTop: 6 }}>{user?.display_name}</Text>
        <Text style={{ fontSize: 16, color: '#4A5361' }}>{[user?.age_band ? t(`common.ageBand.${user.age_band}`) : null, user?.area_name].filter(Boolean).join(' · ')}</Text>
      </View>

      <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.line, marginBottom: space.lg }}>
        {tabs.map((x) => (
          <Pressable key={x.id} onPress={() => setTab(x.id)} accessibilityRole="tab" accessibilityState={{ selected: tab === x.id }} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderColor: tab === x.id ? colors.accent : 'transparent' }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: tab === x.id ? colors.accent : '#4A5361' }}>{x.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'me' ? (
        <View style={{ gap: space.md }}>
          <El page={page} id="email"><Row icon="mail-outline" label={w('email')} value={user?.email ?? notSet} /></El>
          <El page={page} id="phone"><Row icon="call-outline" label={w('phone')} value={user?.phone ?? notSet} /></El>
          <El page={page} id="ageBand"><Row icon="people-outline" label={w('ageBand')} value={user?.age_band ? t(`common.ageBand.${user.age_band}`) : notSet} /></El>
          <El page={page} id="area"><Row icon="location-outline" label={w('area')} value={user?.area_name ?? notSet} /></El>
          <El page={page} id="editProfile"><Row icon="create-outline" label="" value={w('editProfile')} onPress={() => go('me.edit')} /></El>

          <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink, marginTop: space.md }} accessibilityRole="header">{t('prof.roles')}</Text>
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
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.ink, marginTop: space.sm }} accessibilityRole="header">{t('prof.how_roles')}</Text>
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

          <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink, marginTop: space.md }} accessibilityRole="header">{t('menu.more')}</Text>
          <Row icon="today-outline" label="" value={t('home.index.tab')} onPress={() => go('home.index')} />
          <Row icon="notifications-outline" label="" value={t('channels.notices.heading')} onPress={() => go('channels.notices')} />
          <Row icon="chatbubbles-outline" label="" value={t('channels.chats.heading')} onPress={() => go('channels.chats')} />
          <Row icon="people-circle-outline" label="" value={t('menu.family')} onPress={() => go('family.home')} />
          <Row icon="calendar-outline" label="" value={t('menu.calendar')} onPress={() => go('calendar.today')} />
          <Row icon="sparkles-outline" label="" value={t('menu.aspirations')} onPress={() => go('grow.aspirations')} />
          <Row icon="hand-left-outline" label="" value={t('menu.contributions')} onPress={() => go('grow.contributions')} />
          <Row icon="fitness-outline" label="" value={t('menu.activity')} onPress={() => go('grow.activity')} />
          <Row icon="compass-outline" label="" value={t('menu.library')} onPress={() => go('explore.home')} />
          {__DEV__ ? <Row icon="code-slash" label="" value="Agent test console (developer)" onPress={() => go('dev.console')} /> : null}
        </View>
      ) : null}

      {tab === 'health' ? (
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
          <View style={[box, { marginTop: space.sm }]}>
            <Link label={t('prof.checkin_walks')} onPress={() => go('health.index')} line />
            <Link label={t('prof.walk_history')} onPress={() => go('health.history')} line />
            <Link label={t('prof.get_help')} onPress={() => go('health.help')} />
          </View>
        </View>
      ) : null}

      {tab === 'numbers' ? (
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
                {g.items.map((n, i) => (
                  <NumberRow key={n.word + n.tel} name={t(n.word)} tel={n.tel} call={t('prof.call')} border={i < g.items.length - 1} />
                ))}
              </View>
            </View>
          ))}
          <Text style={{ fontSize: 15, color: '#5A6472' }}>{t('prof.dialler')}</Text>
        </View>
      ) : null}

      {tab === 'settings' ? <Settings t={t} go={go} language={current?.native ?? ''} /> : null}

      {tab === 'me' || tab === 'settings' ? (
        <View style={{ marginTop: space.lg, gap: 6 }}>
          <El page={page} id="signOut">
            <Pressable onPress={() => void signOut()} accessibilityRole="button" style={{ minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.danger }}>{w('signOut')}</Text>
            </Pressable>
          </El>
          <Text style={{ fontSize: 14, color: '#5A6472', textAlign: 'center' }}>{t('prof.sign_out_note')}</Text>
        </View>
      ) : null}
      <El page={page} id="chooseLanguage"><View /></El>
    </BackScreen>
  );
}

function Settings({ t, go, language }: { t: (k: string) => string; go: (k: string) => void; language: string }) {
  const { textSize, readAloud } = useStore(prefs);
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
  const sizes2: { id: TextSize; label: string; fs: number }[] = [
    { id: 'normal', label: 'Small', fs: 15 },
    { id: 'large', label: 'Normal', fs: 17 },
    { id: 'larger', label: 'Large', fs: 20 },
  ];
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: LINE }}></View>
      </View>
      <View style={box}>
        <View style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: LINE, gap: 10 }}>
          <Text style={{ fontWeight: '600', color: colors.ink, fontSize: 16 }}>{t('prof.text_size')}</Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
            {sizes2.map((s) => (
              <Pressable key={s.id} onPress={() => setPref({ textSize: s.id })} accessibilityRole="radio" accessibilityState={{ checked: textSize === s.id }} style={{ flex: 1, minHeight: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: textSize === s.id ? colors.navy : '#FFFFFF', borderWidth: 1, borderColor: textSize === s.id ? colors.navy : '#CFC6B6' }}>
                <Text style={{ fontSize: s.fs, fontWeight: '600', color: textSize === s.id ? '#FFFFFF' : colors.ink }}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ fontSize: 14, color: '#5A6472' }}>{t('prof.size_note')}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderColor: LINE }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', color: colors.ink, fontSize: 16 }}>{t('prof.read_aloud')}</Text>
            <Text style={{ fontSize: 15, color: '#4A5361' }}>{t('prof.read_aloud_d')}</Text>
          </View>
          <Pressable onPress={() => setPref({ readAloud: !readAloud })} accessibilityRole="switch" accessibilityLabel={t('prof.read_aloud')} accessibilityState={{ checked: readAloud }} style={{ width: 52, height: 30, borderRadius: 999, padding: 3, backgroundColor: readAloud ? colors.navy : '#CFC6B6', justifyContent: 'center', alignItems: readAloud ? 'flex-end' : 'flex-start' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' }} />
          </Pressable>
        </View>
        <Link label={t('prof.reminder_calls')} sub={t('prof.reminder_calls_d')} onPress={() => go('calendar.calls')} line />
        <Link label={t('prof.languages_i_speak')} onPress={() => go('language.spoken')} line />
        <Pressable onPress={() => go('language.pick')} accessibilityRole="button" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 64 }}>
          <Text style={{ fontWeight: '600', color: colors.ink, fontSize: 16 }}>{t('me.index.language')}</Text>
          <Text style={{ color: '#4A5361', fontSize: 16 }}>{language}</Text>
        </Pressable>
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
