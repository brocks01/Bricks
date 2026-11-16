// The Market tab, kept simple: the next market day and how many days to go, who has a stall, and who is coming to see you.
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getConnections, type Connection } from '../../../api/wisdom';
import { getMarketEvent, getMarketEvents, type MarketEventCard, type MarketEventDetail } from '../../../api/market';
import { Screen } from '../../../components/ui';
import { useStore } from '../../../core/store';
import { languageStore } from '../../../i18n/store';
import { usePageData, usePageWords } from '../../../kit';
import type { PageDataAction } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { colors, radius, space, type } from '../../../theme/tokens';
import { marketIndex as page } from '../pages';

const LOCALE: Record<string, string> = { en: 'en-SG', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-SG', zh: 'zh-SG', ms: 'ms-SG' };
const ORANGE = '#C8562A'; // the market's colour in the deck

export default function MarketHome() {
  const w = usePageWords(page);
  const go = useNavigate();
  const { code } = useStore(languageStore);
  const { status } = useStore(sessionStore);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  const locale = LOCALE[code] ?? 'en-SG';
  const [event, setEvent] = useState<MarketEventDetail | null | undefined>(undefined); // undefined = loading, null = none planned
  const [mentees, setMentees] = useState<Connection[]>([]);

  useEffect(() => {
    if (status !== 'in') return;
    let live = true;
    (async () => {
      let events: MarketEventCard[];
      try { events = await getMarketEvents(); } catch { if (live) setFailed(true); return; } // a failed request is not the same as "no market day planned"
      const conns = await getConnections().catch(() => [] as Connection[]);
      setFailed(false);
      const soon = events.filter((e) => e.kind === 'market_day' && new Date(e.starts_at).getTime() > Date.now() - 6 * 3600000).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
      const detail = soon ? await getMarketEvent(soon.id).catch(() => null) : null;
      if (!live) return;
      setEvent(detail ?? (soon ? ({ ...soon, stalls: [] } as MarketEventDetail) : null));
      setMentees(conns.filter((c) => c.i_am === 'mentor' && c.status === 'accepted'));
    })();
    return () => { live = false; };
  }, [status, tries]);

  const d = event ? new Date(event.starts_at) : null;
  const days = d ? Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000)) : 0;
  const daysText = !d ? '' : days === 0 ? w('m_today') : days === 1 ? w('m_one_day') : w('m_days', { n: days });
  const dateText = d ? d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const slot = (s: string) => w(s === 'first' ? 'm_slot_first' : s === 'second' ? 'm_slot_second' : 'm_slot_whole');
  const stalls = (event?.stalls ?? []).slice().sort((a, b) => Number(b.mine) - Number(a.mine)).slice(0, 4);
  const coming = mentees.length ? w('m_mentees', { name: mentees[0].with, n: mentees.length - 1 }) : '';
  const comingText = mentees.length === 1 ? mentees[0].with : coming;

  const actions: PageDataAction[] = [
    ...(event ? [{ id: 'openMarketDay', label: w('m_open'), run: () => { go('market.day', { id: event.id }); } }] : []),
    { id: 'moreNearby', label: w('m_more'), run: () => { go('market.more'); } },
  ];
  usePageData(page, event !== undefined ? {
    values: [{ label: w('m_title'), value: event ? `${dateText} · ${event.venue_name}. ${daysText}` : w('m_none') }],
    images: [],
    lists: [{ label: w('m_stalls'), items: stalls.map((s) => ({ label: s.selling, detail: `${s.seller} · ${slot(s.slot)}` })) }],
    actions,
  } : null);

  return (
    <Screen title="" hero={<Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '800', color: colors.navy, marginBottom: space.md }}>{w('m_title')}</Text>}>
      {failed ? (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, marginBottom: space.md }}>
          <Text style={[type.body, { color: colors.danger }]}>{w('m_failed')}</Text>
          <Pressable onPress={() => setTries((t) => t + 1)} accessibilityRole="button" style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: space.sm, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: colors.accent }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.card }}>{w('m_retry')}</Text>
          </Pressable>
        </View>
      ) : null}
      {event ? (
        <Pressable onPress={() => { go('market.day', { id: event.id }); }} accessibilityRole="button" style={{ backgroundColor: ORANGE, borderRadius: radius.card, padding: space.lg, marginBottom: space.md }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.card }}>{dateText} · {event.venue_name}</Text>
          <Text style={{ fontSize: 16, color: '#FBE3D6', marginTop: 4 }}>{daysText}{event.going_count ? ` · ${w('m_going', { n: event.going_count })}` : ''}</Text>
        </Pressable>
      ) : event === null && !failed ? (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, marginBottom: space.md }}>
          <Text style={[type.body, { color: colors.muted }]}>{w('m_none')}</Text>
        </View>
      ) : null}

      {stalls.map((s) => (
        <View key={s.id} style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.sm }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.navy }}>{s.selling}</Text>
          <Text style={[type.small, { color: s.mine ? ORANGE : colors.muted, fontWeight: s.mine ? '800' : '400', marginTop: 2 }]}>{s.mine ? `${w('m_yours')} · ` : `${s.seller} · `}{slot(s.slot)}</Text>
        </View>
      ))}

      {comingText ? (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.sm }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.navy }}>{w('m_coming')}</Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: ORANGE, marginTop: 2 }}>{comingText}</Text>
        </View>
      ) : null}

      <Pressable onPress={() => { go('market.more'); }} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: space.sm }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>{w('m_more')}</Text>
      </Pressable>
    </Screen>
  );
}
