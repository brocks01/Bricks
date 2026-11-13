import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { calendarApi, type CalendarPerson, type MarkStatus, type Occurrence } from '../../../../api/calendar';
import { Button, ErrorText, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useLanguage } from '../../../../i18n';
import { El, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { calendarToday as page } from './page';

// The Calendar tab. Everything shown comes from the server, expanded from the saved plans; the marks
// are saved at once. A family member I hold access for can be chosen under "Whose calendar".
const KIND_ICON: Record<string, string> = {
  medicine: 'medkit',
  appointment: 'time',
  exercise: 'fitness',
  event: 'flag',
  call: 'call',
  other: 'ellipse-outline',
};

export default function CalendarTab() {
  const w = usePageWords(page);
  const lang = useLanguage();
  const go = useNavigate();
  const { status } = useStore(sessionStore);
  const [people, setPeople] = useState<CalendarPerson[] | null>(null);
  const [who, setWho] = useState<string | null>(null); // the chosen person id; null = me
  const [rows, setRows] = useState<Occurrence[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // "item|occurs_at" while its mark is being saved
  const [now, setNow] = useState(() => Date.now()); // refreshed with every poll, for due and missed
  const [dismissed, setDismissed] = useState<string[]>([]); // the due-now banners put off this session

  const loadPeople = useCallback(() => {
    calendarApi.people().then((r) => {
      setPeople(r.people);
      setWho((cur) => cur ?? r.people[0]?.id ?? null);
    }).catch(() => setFailed(true));
  }, []);
  const loadRows = useCallback(() => {
    if (!who) return;
    setNow(Date.now());
    calendarApi.occurrences(who).then((r) => {
      setRows(r.occurrences);
      setFailed(false);
    }).catch(() => setFailed(true));
  }, [who]);
  useEffect(() => {
    if (status === 'in') loadPeople();
  }, [status, loadPeople]);
  // While the tab is open: every minute, say "the app is open" (with the phone's own time zone) and
  // refresh the week. This is what the reminder loop later reads as "the app reached this person".
  useEffect(() => {
    if (status !== 'in') return;
    const tz = -new Date().getTimezoneOffset();
    const tick = () => {
      calendarApi.heartbeat(tz).catch(() => undefined);
      loadRows();
    };
    tick();
    const h = setInterval(tick, 60_000);
    return () => clearInterval(h);
  }, [status, loadRows]);

  const setMark = async (o: Occurrence, next: 'done' | 'skipped') => {
    if (!o.item_id || busy) return;
    setBusy(`${o.item_id}|${o.occurs_at}`);
    try {
      if (o.status === 'pending') await calendarApi.mark(o.item_id, o.occurs_at, next);
      else await calendarApi.unmark(o.item_id, o.occurs_at);
      setRows((cur) => (cur ?? []).map((r) => (r.item_id === o.item_id && r.occurs_at === o.occurs_at
        ? { ...r, status: (r.status === 'pending' ? next : 'pending') as MarkStatus }
        : r)));
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  const time = (iso: string) => new Date(iso).toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' });
  const dayKey = (iso: string) => new Date(iso).toDateString();
  const today = new Date(now).toDateString();
  const tomorrow = new Date(now + 86400000).toDateString();
  const dayLabel = (iso: string) => {
    const key = dayKey(iso);
    if (key === today) return w('today');
    if (key === tomorrow) return w('tomorrow');
    return new Date(iso).toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const days: { key: string; label: string; rows: Occurrence[] }[] = [];
  for (const o of rows ?? []) {
    const key = dayKey(o.occurs_at);
    const last = days[days.length - 1];
    if (last && last.key === key) last.rows.push(o);
    else days.push({ key, label: dayLabel(o.occurs_at), rows: [o] });
  }

  const statusTag = (o: Occurrence) => (o.status === 'done' ? w('doneTag') : o.status === 'skipped' ? w('skippedTag') : null);
  const isMissed = (o: Occurrence) => o.status === 'pending' && new Date(o.occurs_at).getTime() + 60 * 60 * 1000 < now;
  // Due now: pending, inside its own remind-before window (or already at the time), not past the hour.
  const due = (rows ?? []).find((o) => {
    if (o.status !== 'pending' || !o.item_id || isMissed(o)) return false;
    const t = new Date(o.occurs_at).getTime();
    return t - o.remind_before_min * 60_000 <= now && t + 60 * 60 * 1000 > now && !dismissed.includes(`${o.item_id}|${o.occurs_at}`);
  });

  return (
    <Screen title={w('heading')} subtitle={w('intro')}>
      {due ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.accentSoft, borderRadius: radius.card, borderWidth: 1, borderColor: colors.accent, padding: space.md, marginBottom: space.md }}>
          <Ionicons name="notifications" size={24} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[type.small, { color: colors.accent, fontWeight: '700' }]}>{w('dueHeading')}</Text>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>
              {w('dueTitle', { title: due.title, time: time(due.occurs_at) })}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => void setMark(due, 'done')}
            style={{ backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: space.md, paddingVertical: space.xs }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{w('done')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setDismissed((cur) => [...cur, `${due.item_id}|${due.occurs_at}`])}>
            <Text style={{ color: colors.muted, fontWeight: '600' }}>{w('dueLater')}</Text>
          </Pressable>
        </View>
      ) : null}

      {(people ?? []).length > 1 ? (
        <El page={page} id="forWho">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginBottom: space.md }}>
            {(people ?? []).map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                onPress={() => { setWho(p.id); setRows(null); }}
                style={{
                  paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: 999,
                  backgroundColor: who === p.id ? colors.accent : colors.card, borderWidth: 1,
                  borderColor: who === p.id ? colors.accent : colors.line,
                }}
              >
                <Text style={{ color: who === p.id ? '#fff' : colors.ink, fontWeight: '600', fontSize: 14 }}>
                  {p.name || w('me')}
                </Text>
              </Pressable>
            ))}
          </View>
        </El>
      ) : null}

      {rows === null && !failed ? null : days.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: space.xl, gap: space.sm }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="calendar" size={44} color={colors.accent} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: space.sm }}>{w('empty')}</Text>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center', maxWidth: 280 }]}>{w('emptyHint')}</Text>
        </View>
      ) : (
        days.map((d) => (
          <View key={d.key} style={{ marginBottom: space.md }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.muted, marginBottom: space.xs }}>{d.label}</Text>
            {d.rows.map((o) => (
              <View
                key={`${o.item_id}|${o.occurs_at}`}
                style={{
                  backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line,
                  padding: space.md, marginBottom: space.xs,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  {/* The text area and the Done / Skip buttons are SIBLINGS: a button inside a button is invalid on the web and crashes the page. */}
                  <Pressable
                    accessibilityRole={o.can_edit ? 'button' : undefined}
                    onPress={o.can_edit && o.item_id ? () => go('calendar.item', { id: o.item_id! }) : undefined}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md }}
                  >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={(KIND_ICON[o.kind] ?? 'ellipse-outline') as never} size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }} numberOfLines={1}>
                      {o.title} {statusTag(o) ? <Text style={{ color: colors.muted, fontWeight: '600' }}>· {statusTag(o)}</Text> : null}
                    </Text>
                    <Text style={[type.small, { color: isMissed(o) ? '#b3261e' : colors.muted, fontWeight: isMissed(o) ? '700' : '400' }]} numberOfLines={1}>
                      {[
                        isMissed(o) ? w('missedTag') : null,
                        time(o.occurs_at),
                        o.added_by_name ? w('addedBy', { name: o.added_by_name }) : null,
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  </Pressable>
                  {o.can_edit && o.item_id ? (
                    <View style={{ flexDirection: 'row', gap: space.xs }}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void setMark(o, 'done')}
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: o.status === 'done' ? colors.accent : colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name={o.status === 'done' ? 'refresh' : 'checkmark'} size={20} color={o.status === 'done' ? '#fff' : colors.accent} />
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void setMark(o, 'skipped')}
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: o.status === 'skipped' ? colors.accent : colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Ionicons name={o.status === 'skipped' ? 'refresh' : 'close'} size={20} color={o.status === 'skipped' ? '#fff' : colors.accent} />
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ))
      )}

      {failed ? <ErrorText>{w('tryAgain')}</ErrorText> : null}
      <View style={{ marginTop: space.md }}>
        <El page={page} id="add">
          <Button label={w('add')} icon="add" onPress={() => go('calendar.new', { person: who ?? '' })} kind="primary" />
        </El>
      </View>
    </Screen>
  );
}


