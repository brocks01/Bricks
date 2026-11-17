import { Ionicons } from '@expo/vector-icons';
import { useLiveEpoch, useSavedState } from '../../core/useFocusLive';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { calendarApi } from '../../api/calendar';
import type { HomeEvent } from '../../api/home';
import { getWisdom, type WisdomEvent } from '../../api/nodes';
import type { LangCode } from '../../i18n/languages';
import { El, useAction, useField } from '../../kit';
import { colors, radius, space, tints } from '../../theme/tokens';
import { SourceTag } from './EventCard';
import { homeIndex as page } from './pages';
import { byDay, leadingBlanks, monthCells, monthTitle, shiftMonth, weekdayNames, type Cell, type DayItem } from './month';
import { dateWords, timeWords } from './when';

type W = (id: string, vars?: Record<string, string | number>) => string;
const TROPHY = '#B7791F';
const FLAG = '#8F3B1A';

const fromUpcoming = (e: HomeEvent): DayItem => ({ key: `${e.source}:${e.id}`, source: e.source, title: e.title, at: e.starts_at, place: e.place, going: e.going, wasThere: false, open: { key: e.open_key, params: e.open_params } });
const fromLeaf = (l: WisdomEvent): DayItem => ({ key: `${l.source}:${l.ref_id}`, source: l.source, title: l.title, at: l.at, place: null, going: false, wasThere: true });

/**
 * The calendar's state: which month is shown, which day is open, and everything on the days of that month, from three places:
 * the upcoming events (passed in), the leaves (events the person showed up to, paged back as far as the month needs), and their own
 * calendar's appointments and events. The same event from two places is one item (see month.ts).
 */
export function useHomeCalendar(upcoming: HomeEvent[] | null, now: Date) {
  const [shown, setShown] = useState(() => ({ year: now.getFullYear(), month0: now.getMonth() }));
  const [picked, setPicked] = useState<number | null>(null);
  const [leaves, setLeaves] = useSavedState<WisdomEvent[]>('home.calendar.leaves', []);
  const [leavesFrom, setLeavesFrom] = useState<string | null>(null); // the cursor for older leaves; null when all are loaded
  const [own, setOwn] = useSavedState<DayItem[]>('home.calendar.own', []);

  // Leaves: the newest page first, then older pages until the shown month is covered.
  const liveEpoch = useLiveEpoch();
  useEffect(() => {
    let live = true;
    getWisdom(50).then((r) => { if (live) { setLeaves(r.events); setLeavesFrom(r.next_before); } }).catch(() => undefined);
    return () => { live = false; };
  }, [upcoming, liveEpoch]);
  useEffect(() => {
    const oldest = leaves[leaves.length - 1];
    if (!leavesFrom || !oldest || new Date(oldest.at) < new Date(shown.year, shown.month0, 1)) return;
    let live = true;
    getWisdom(50, leavesFrom).then((r) => { if (live) { setLeaves((l) => [...l, ...r.events]); setLeavesFrom(r.next_before); } }).catch(() => undefined);
    return () => { live = false; };
  }, [leaves, leavesFrom, shown, liveEpoch]);
  // The person's own calendar for the shown month: appointments and events (daily reminders such as medicine would put a flag on every day).
  useEffect(() => {
    let live = true;
    const from = new Date(shown.year, shown.month0, 1);
    const to = new Date(shown.year, shown.month0 + 1, 1);
    calendarApi.occurrences(undefined, from.toISOString(), to.toISOString())
      .then((r) => {
        if (!live) return;
        setOwn(r.occurrences.filter((o) => (o.kind === 'appointment' || o.kind === 'event') && !o.activity_id && o.status !== 'skipped').map((o) => ({
          key: `reminder:${o.item_id ?? ''}:${o.occurs_at}`, source: 'reminder' as const, title: o.title, at: o.occurs_at, place: o.note, going: false, wasThere: false,
          open: o.item_id ? { key: 'calendar.item', params: { id: o.item_id } } : undefined,
        })));
      })
      .catch(() => { if (live) setOwn([]); });
    return () => { live = false; };
  }, [shown, upcoming, liveEpoch]);

  const days = useMemo(() => byDay([...(upcoming ?? []).map(fromUpcoming), ...leaves.map(fromLeaf), ...own]), [upcoming, leaves, own]);
  const cells = useMemo(() => monthCells(shown.year, shown.month0, now, days), [shown, now, days]);
  const move = useCallback((by: number) => { setPicked(null); setShown((s) => shiftMonth(s.year, s.month0, by)); }, []);
  const pickedCell = picked ? cells[picked - 1] ?? null : null;
  return { shown, cells, days, picked, pickedCell, setPicked, move };
}
export type HomeCalendarState = ReturnType<typeof useHomeCalendar>;

/** The month: its name with two big arrows, the weekday names, the days (a flag for something coming up, a trophy for a day the person was there). */
export function HomeCalendar({ cal, now, lang, w, onOpen }: { cal: HomeCalendarState; now: Date; lang: LangCode; w: W; onOpen: (o: { key: string; params: Record<string, string> }) => void }) {
  const { shown, cells, days, picked, pickedCell, setPicked, move } = cal;
  useAction(page, 'prevMonth', () => move(-1));
  useAction(page, 'nextMonth', () => move(1));
  useAction(page, 'closeDay', () => setPicked(null));
  useField(page, 'day', picked ?? 0, (v) => { const n = Math.floor(Number(v)); setPicked(n >= 1 && n <= cells.length ? n : null); });

  const names = weekdayNames(lang);
  const blanks = leadingBlanks(shown.year, shown.month0);
  const label = (c: Cell) => {
    const date = dateWords(new Date(shown.year, shown.month0, c.day), now, lang);
    const base = c.trophy ? w('day_was_there', { date }) : c.flag ? w('day_coming', { date }) : date;
    return c.today ? `${base}, ${w('today_mark')}` : base;
  };
  const items = pickedCell ? days.get(pickedCell.key) ?? [] : [];
  const close = () => setPicked(null);

  return (
    <View style={{ marginTop: space.xl }}>
      <El page={page} id="calendar"><Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: '800', color: colors.ink, marginBottom: space.md }}>{w('calendar_title')}</Text></El>
      <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md }}>
          <El page={page} id="prevMonth"><Arrow icon="chevron-back" label={w('prev_month')} onPress={() => move(-1)} /></El>
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ flex: 1, textAlign: 'center', fontSize: 22, lineHeight: 28, fontWeight: '800', color: colors.ink }}>{monthTitle(shown.year, shown.month0, lang)}</Text>
          <El page={page} id="nextMonth"><Arrow icon="chevron-forward" label={w('next_month')} onPress={() => move(1)} /></El>
        </View>
        <View style={{ flexDirection: 'row' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {names.map((n) => (
            <Text key={n} numberOfLines={1} style={{ width: `${100 / 7}%`, textAlign: 'center', fontSize: 15, fontWeight: '700', color: colors.ink, paddingBottom: 6 }}>{n}</Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: blanks }, (_, i) => <View key={`b${i}`} style={{ width: `${100 / 7}%`, height: 60 }} />)}
          {cells.map((c) => (
            <View key={c.key} style={{ width: `${100 / 7}%`, height: 60, padding: 2 }}>
              <Pressable
                onPress={() => setPicked(c.day)}
                accessibilityRole="button"
                accessibilityLabel={label(c)}
                style={({ pressed }) => ({
                  flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14,
                  backgroundColor: c.flag ? tints.sand : c.trophy ? '#FBF3DC' : pressed ? colors.bg : 'transparent',
                  borderWidth: c.today ? 3 : 0, borderColor: colors.accent,
                })}
              >
                <Text style={{ fontSize: 19, lineHeight: 22, fontWeight: c.today || c.flag || c.trophy ? '800' : '500', color: c.past && !c.trophy ? colors.muted : colors.ink }}>{c.day}</Text>
                {c.trophy ? <Ionicons name="trophy" size={16} color={TROPHY} accessible={false} /> : c.flag ? <Ionicons name="flag" size={16} color={FLAG} accessible={false} /> : <View style={{ height: 16 }} />}
              </Pressable>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 4, marginTop: space.md }}>
          <Ionicons name="flag" size={18} color={FLAG} accessible={false} />
          <Text style={{ fontSize: 17, color: colors.ink }}>{w('flag_word')}: {w('legend_flag')}</Text>
          <Text style={{ fontSize: 17, color: colors.muted }}> · </Text>
          <Ionicons name="trophy" size={18} color={TROPHY} accessible={false} />
          <Text style={{ fontSize: 17, color: colors.ink }}>{w('trophy_word')}: {w('legend_trophy')}</Text>
        </View>
      </View>

      <Modal visible={!!pickedCell} transparent animationType="fade" onRequestClose={close}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg }}>
          <Pressable onPress={close} accessibilityLabel={w('close')} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17,24,39,0.55)' }} />
          {pickedCell ? (
            <View role="dialog" aria-modal accessibilityViewIsModal aria-label={dateWords(new Date(shown.year, shown.month0, pickedCell.day), now, lang)} style={{ width: '100%', maxWidth: 380, maxHeight: '85%', backgroundColor: colors.card, borderRadius: radius.card, padding: space.lg, gap: space.md }}>
              <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.ink }}>{dateWords(new Date(shown.year, shown.month0, pickedCell.day), now, lang)}</Text>
              <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: space.sm }}>
                {items.length === 0 ? <Text style={{ fontSize: 19, lineHeight: 26, color: colors.ink }}>{w('nothing_day')}</Text> : null}
                {items.map((it) => {
                  const body = (
                    <View style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
                        <Text style={{ flex: 1, fontSize: 20, lineHeight: 26, fontWeight: '800', color: colors.ink }}>{it.title}</Text>
                        {it.source === 'reminder' ? <Quiet label={w('reminder')} /> : <SourceTag source={it.source} label={w(`tag_${it.source}`)} />}
                      </View>
                      <Text style={{ fontSize: 18, color: colors.ink }}>{timeWords(new Date(it.at), lang)}{it.place ? ` · ${it.place}` : ''}</Text>
                      {it.wasThere ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="trophy" size={20} color={TROPHY} accessible={false} /><Text style={{ fontSize: 18, fontWeight: '700', color: TROPHY }}>{w('you_were_there')}</Text></View>
                      ) : it.going ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="checkmark-circle" size={20} color="#1E7A46" accessible={false} /><Text style={{ fontSize: 18, fontWeight: '700', color: '#1E7A46' }}>{w('you_going')}</Text></View>
                      ) : null}
                    </View>
                  );
                  const box = { borderWidth: 1, borderColor: colors.line, borderRadius: radius.button, padding: space.md } as const;
                  return it.open ? (
                    <Pressable key={it.key} onPress={() => { const o = it.open; close(); if (o) onOpen(o); }} accessibilityRole="button" style={({ pressed }) => ({ ...box, backgroundColor: pressed ? colors.bg : colors.card })}>{body}</Pressable>
                  ) : (
                    <View key={it.key} style={box}>{body}</View>
                  );
                })}
              </ScrollView>
              <El page={page} id="closeDay">
                <Pressable onPress={close} accessibilityRole="button" style={({ pressed }) => ({ minHeight: 56, borderRadius: radius.button, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
                  <Text style={{ fontSize: 19, fontWeight: '800', color: colors.card }}>{w('close')}</Text>
                </Pressable>
              </El>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function Arrow({ icon, label, onPress }: { icon: 'chevron-back' | 'chevron-forward'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={({ pressed }) => ({ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.navy, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.navySoft : colors.card })}>
      <Ionicons name={icon} size={28} color={colors.navy} accessible={false} />
    </Pressable>
  );
}

function Quiet({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.bg, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Ionicons name="alarm-outline" size={16} color={colors.ink} accessible={false} />
      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{label}</Text>
    </View>
  );
}

