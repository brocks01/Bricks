import { Pressable, Text, View } from 'react-native';
import type { Occurrence } from '../../../api/calendar';
import { colors } from '../../../theme/tokens';

type W = (key: string, vars?: Record<string, string | number>) => string;
const KIND_COLOR: Record<string, string> = { medicine: '#B45309', appointment: '#1B2B44', exercise: '#2E6B4E', event: '#B0502A', call: '#5A6472', other: '#9CA3AF' };
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

/** The weeks of a month, Monday first, as rows of seven (null before the 1st and after the last). */
export function monthWeeks(year: number, month: number): (number | null)[][] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
}

/**
 * The paper-diary month from the design: a row per week, a button per day with a dot when something is planned, and under it the chosen day's list.
 * What is planned comes from the person's own calendar (reminders, accepted bookings, gatherings they said yes to).
 */
export function MonthPlanner({ now, occs, picked, onPick, lang, w }: { now: Date; occs: Occurrence[]; picked: number; onPick: (day: number) => void; lang: string; w: W }) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const weeks = monthWeeks(year, month);
  const byDay = new Map<string, Occurrence[]>();
  for (const o of occs) {
    const k = dayKey(new Date(o.occurs_at));
    byDay.set(k, [...(byDay.get(k) ?? []), o]);
  }
  const itemsOf = (day: number) => (byDay.get(`${year}-${month + 1}-${day}`) ?? []).sort((a, b) => a.occurs_at.localeCompare(b.occurs_at));
  const letters = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(lang, { weekday: 'narrow' }));
  const monthName = now.toLocaleDateString(lang, { month: 'long' });
  const chosen = itemsOf(picked);
  const chosenTitle = new Date(year, month, picked).toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' });
  const time = (iso: string) => new Date(iso).toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' });
  const box = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14 } as const;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink }} accessibilityRole="header">{w('my_month', { month: monthName })}</Text>
        <Text style={{ fontSize: 15, color: '#5A6472' }}>{w('tap_day')}</Text>
      </View>
      <View style={[box, { paddingVertical: 14, paddingHorizontal: 10, gap: 6 }]}>
        <View style={{ flexDirection: 'row', gap: 3 }}>
          <View style={{ width: 54 }} />
          {letters.map((l, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#5A6472' }}>{l}</Text>)}
        </View>
        {weeks.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
            <Text style={{ width: 54, fontSize: 13, fontWeight: '600', color: '#5A6472' }}>{w('week_n', { n: r + 1 })}</Text>
            {row.map((d, i) => {
              if (d === null) return <View key={i} style={{ flex: 1, height: 48 }} />;
              const on = d === picked;
              const isToday = d === now.getDate();
              const has = itemsOf(d).length > 0;
              return (
                <Pressable key={i} onPress={() => onPick(d)} accessibilityRole="button" accessibilityLabel={new Date(year, month, d).toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' })} accessibilityState={{ selected: on }}
                  style={{ flex: 1, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: on ? colors.navy : isToday ? colors.navySoft : colors.card, borderWidth: on ? 0 : isToday ? 1 : 0, borderColor: colors.navy }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', lineHeight: 15, color: on ? '#FFFFFF' : colors.ink }}>{d}</Text>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: has ? (on ? colors.gold : colors.accent) : 'transparent' }} />
                </Pressable>
              );
            })}
          </View>
        ))}
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink, paddingTop: 10, paddingHorizontal: 4, borderTopWidth: 1, borderColor: '#EDE6DA', marginTop: 6 }}>{chosenTitle}</Text>
      </View>
      <View style={[box, { paddingHorizontal: 16 }]}>
        {chosen.length === 0 ? <Text style={{ paddingVertical: 16, fontSize: 16, color: '#4A5361' }}>{w('nothing_day')}</Text> : null}
        {chosen.map((o, i) => (
          <View key={`${o.item_id ?? o.activity_id}-${o.occurs_at}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: i < chosen.length - 1 ? 1 : 0, borderColor: '#EDE6DA' }}>
            <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: KIND_COLOR[o.kind] ?? KIND_COLOR.other }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>{o.title}</Text>
              <Text style={{ fontSize: 15, color: '#4A5361' }}>{time(o.occurs_at)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
