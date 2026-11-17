import { Ionicons } from '@expo/vector-icons';
import { useLiveEpoch } from '../../core/useFocusLive';
import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { getActivities, setGoing, type CommunityActivity } from '../../api/communities';
import type { AboutEvent } from '../../api/communityRules';
import { checkIn } from '../../api/lead';
import { SkeletonList } from '../../components/Skeleton';
import { useLanguage, useT } from '../../i18n';
import { useNavigate } from '../../navigation';
import { colors, radius, space } from '../../theme/tokens';
import '../connect/revampWords'; // registers the words
import { dayHeading, whenWords, type Lang } from './when';

const GREEN = '#1F7A3F'; // a dark green with strong contrast on white and on its soft tint
const GREEN_SOFT = '#E3F1E7';
const BEFORE_MS = 60 * 60 * 1000; // "I'm here" opens an hour before the start (the server's own window)...
const AFTER_MS = 12 * 60 * 60 * 1000; // ...and stays open for the rest of the day

type Ev = Pick<CommunityActivity, 'id' | 'title' | 'starts_at' | 'ends_at' | 'location' | 'image_url' | 'going_count'> & { i_going?: boolean; i_attended?: boolean };

function inWindow(e: Ev, now: number): boolean {
  const start = new Date(e.starts_at).getTime();
  const end = e.ends_at ? new Date(e.ends_at).getTime() : start + 2 * 60 * 60 * 1000;
  return now >= start - BEFORE_MS && now <= Math.max(end, start + AFTER_MS);
}

function Big({ label, icon, onPress, tone }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; tone: 'go' | 'here' }) {
  const bg = tone === 'here' ? GREEN : colors.navy;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: 56, borderRadius: radius.button, backgroundColor: bg, opacity: pressed ? 0.85 : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.lg })}>
      <Ionicons name={icon} size={24} color="#FFFFFF" />
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>{label}</Text>
    </Pressable>
  );
}

/**
 * One gathering, self-contained: what, when in plain words, where, how many are going, the picture on the right when it has one, and inside the card
 * one obvious button. "I'm going" becomes "You are going" (with the promise of a leaf and a small Change); while the gathering is on, "I'm here"
 * becomes "You came +1 leaf". The leaf itself is counted by the server when the person checks in; this card never counts leaves.
 */
export function EventCard({ e, member, now, onOpen, onChanged }: { e: Ev; member: boolean; now: number; onOpen?: () => void; onChanged?: (e: Ev) => void }) {
  const t = useT();
  const lang = useLanguage() as Lang;
  const [mine, setMine] = useState<{ from: Ev; now: Ev } | null>(null);
  const ev = mine && mine.from === e ? mine.now : e; // a change made here, until the list brings a fresh copy
  const [error, setError] = useState<string | null>(null);
  const change = (next: Ev) => { setMine({ from: e, now: next }); onChanged?.(next); };
  const going = async (on: boolean) => {
    setError(null);
    const before = ev;
    change({ ...ev, i_going: on, going_count: ev.going_count + (on ? 1 : -1) });
    try { await setGoing(ev.id, on); } catch { change(before); setError(t('rules.err_failed')); }
  };
  const here = async () => {
    setError(null);
    try {
      await checkIn(ev.id);
      change({ ...ev, i_attended: true, i_going: false });
    } catch (x) {
      setError(x instanceof ApiError && x.code === 'not_open_yet' ? t('rv.here_later') : t('rules.err_failed'));
    }
  };
  const open = inWindow(ev, now);
  const start = new Date(ev.starts_at).getTime();
  const over = !open && start < now;
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md }}>
      <Pressable onPress={onOpen} disabled={!onOpen} accessibilityRole={onOpen ? 'button' : undefined} accessibilityLabel={ev.title} style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontSize: 20, lineHeight: 26, fontWeight: '700', color: colors.ink }}>{ev.title}</Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
            <Ionicons name="time-outline" size={20} color={colors.muted} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 17, lineHeight: 24, color: colors.ink }}>{whenWords(ev.starts_at, lang, new Date(now))}</Text>
          </View>
          {ev.location ? (
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
              <Ionicons name="location-outline" size={20} color={colors.muted} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontSize: 17, lineHeight: 24, color: colors.ink }}>{ev.location}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Ionicons name="people-outline" size={20} color={colors.muted} />
            <Text style={{ fontSize: 17, color: colors.ink }}>{t('rv.going_n', { n: ev.going_count })}</Text>
          </View>
        </View>
        {ev.image_url ? <Image source={{ uri: ev.image_url }} accessibilityIgnoresInvertColors style={{ width: 96, height: 96, borderRadius: 16, backgroundColor: colors.accentSoft }} /> : null}
      </Pressable>

      {member && ev.i_attended ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: GREEN_SOFT, borderRadius: radius.button, padding: space.md }}>
          <Ionicons name="checkmark-circle" size={26} color={GREEN} />
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: GREEN }}>{t('rv.you_came')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="leaf" size={20} color={GREEN} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: GREEN }}>{t('rv.plus_leaf')}</Text>
          </View>
        </View>
      ) : member && open ? (
        <Big tone="here" icon="hand-right-outline" label={t('rv.im_here')} onPress={() => void here()} />
      ) : member && !over && ev.i_going ? (
        <View style={{ backgroundColor: GREEN_SOFT, borderRadius: radius.button, padding: space.md, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Ionicons name="checkmark-circle" size={26} color={GREEN} />
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: GREEN }}>{t('rv.you_going')}</Text>
            <Pressable onPress={() => void going(false)} accessibilityRole="button" accessibilityLabel={`${t('rv.change')}: ${ev.title}`} hitSlop={8}
              style={{ minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.navy, textDecorationLine: 'underline' }}>{t('rv.change')}</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="leaf-outline" size={18} color={GREEN} />
            <Text style={{ fontSize: 16, color: GREEN }}>{t('rv.earn_leaf')}</Text>
          </View>
        </View>
      ) : member && !over ? (
        <Big tone="go" icon="checkmark" label={t('rv.im_going')} onPress={() => void going(true)} />
      ) : null}
      {error ? <Text accessibilityLiveRegion="polite" style={{ fontSize: 16, fontWeight: '600', color: colors.danger }}>{error}</Text> : null}
    </View>
  );
}

function Switch({ value, onChange }: { value: 'upcoming' | 'past'; onChange: (v: 'upcoming' | 'past') => void }) {
  const t = useT();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: colors.bone, borderRadius: radius.pill, padding: 4, marginBottom: space.md }}>
      {(['upcoming', 'past'] as const).map((k) => {
        const on = value === k;
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flex: 1, minHeight: 48, borderRadius: radius.pill, backgroundColor: on ? colors.card : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: on ? '800' : '600', color: on ? colors.ink : colors.muted }}>{t(`rv.${k}`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A community's gatherings with an Upcoming / Past switch and date headings ("Tomorrow · Wednesday"). A member gets the real lists with
 * "I'm going" and "I'm here"; someone who is not in the community sees what is coming up (from the community's public basics), without buttons.
 */
export function EventList({ cid, member, preview, eventsUrl }: { cid: string; member: boolean; preview?: AboutEvent[]; eventsUrl?: string | null }) {
  const t = useT();
  const lang = useLanguage() as Lang;
  const go = useNavigate();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [got, setGot] = useState<{ key: string; list: Ev[] } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [tries, setTries] = useState(0);
  const [now] = useState(() => Date.now());
  const key = `${cid}:${tab}:${tries}`;
  const liveEpoch = useLiveEpoch();
  useEffect(() => {
    if (!member) return;
    let live = true;
    getActivities(cid, tab)
      .then((l) => { if (live) { setGot({ key, list: l }); setFailed(null); } })
      .catch(() => { if (live) setFailed(key); });
    return () => { live = false; };
  }, [cid, member, tab, key, liveEpoch]);
  const load = useCallback(() => setTries((n) => n + 1), []);
  const list: Ev[] | null = member ? (got && got.key === key ? got.list : null) : tab === 'upcoming' ? (preview ?? []) : [];

  const groups: { head: string; items: Ev[] }[] = [];
  for (const e of list ?? []) {
    const head = dayHeading(e.starts_at, lang, new Date(now));
    const last = groups[groups.length - 1];
    if (last && last.head === head) last.items.push(e);
    else groups.push({ head, items: [e] });
  }
  return (
    <View>
      {member ? <Switch value={tab} onChange={setTab} /> : null}
      {failed === key ? (
        <Pressable onPress={load} accessibilityRole="button" style={{ minHeight: 56, justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, color: colors.danger, fontWeight: '600' }}>{t('rv.failed')}</Text>
        </Pressable>
      ) : list === null ? <SkeletonList count={2} /> : !list.length ? (
        <Text style={{ fontSize: 18, lineHeight: 26, color: colors.ink, marginVertical: space.md }}>{t(tab === 'upcoming' ? 'rv.no_upcoming' : 'rv.no_past')}</Text>
      ) : (
        groups.map((g) => (
          <View key={g.head} style={{ marginBottom: space.md }}>
            <Text accessibilityRole="header" style={{ fontSize: 19, fontWeight: '800', color: colors.navy, marginBottom: space.sm }}>{g.head}</Text>
            <View style={{ gap: space.md }}>
              {g.items.map((e) => (
                <EventCard key={e.id} e={e} member={member} now={now} onOpen={member ? () => go('community.event', { id: cid, eid: e.id }) : undefined} />
              ))}
            </View>
          </View>
        ))
      )}
      {eventsUrl ? (
        <Pressable onPress={() => void Linking.openURL(eventsUrl)} accessibilityRole="link" style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="open-outline" size={22} color={colors.navy} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.navy, textDecorationLine: 'underline' }}>{t('rv.events_page')}</Text>
        </Pressable>
      ) : null}
      <View style={{ height: 96 }} />{/* the last card clears the bottom bar and the agent button */}
    </View>
  );
}
