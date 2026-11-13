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
  const [now] = useState(() => Date.now()); // one snapshot for the day labels, not a new time every render

  const loadPeople = useCallback(() => {
    calendarApi.people().then((r) => {
      setPeople(r.people);
      setWho((cur) => cur ?? r.people[0]?.id ?? null);
    }).catch(() => setFailed(true));
  }, []);
  const loadRows = useCallback(() => {
    if (!who) return;
    calendarApi.occurrences(who).then((r) => {
      setRows(r.occurrences);
      setFailed(false);
    }).catch(() => setFailed(true));
  }, [who]);
  useEffect(() => {
    if (status === 'in') loadPeople();
  }, [status, loadPeople]);
  useEffect(() => {
    if (status === 'in') loadRows();
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

  return (
    <Screen title={w('heading')} subtitle={w('intro')}>
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
              <Pressable
                key={`${o.item_id}|${o.occurs_at}`}
                accessibilityRole={o.can_edit ? 'button' : undefined}
                onPress={o.can_edit && o.item_id ? () => go('calendar.item', { id: o.item_id! }) : undefined}
                style={{
                  backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line,
                  padding: space.md, marginBottom: space.xs,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={(KIND_ICON[o.kind] ?? 'ellipse-outline') as never} size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }} numberOfLines={1}>
                      {o.title} {statusTag(o) ? <Text style={{ color: colors.muted, fontWeight: '600' }}>Â· {statusTag(o)}</Text> : null}
                    </Text>
                    <Text style={[type.small, { color: colors.muted }]} numberOfLines={1}>
                      {[time(o.occurs_at), o.added_by_name ? w('addedBy', { name: o.added_by_name }) : null].filter(Boolean).join(' Â· ')}
                    </Text>
                  </View>
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
              </Pressable>
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


