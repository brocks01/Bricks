import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { calendarApi, type CalendarKind, type CalendarPerson, type CalendarRepeat, type Clash } from '../../../../api/calendar';
import { ApiError } from '../../../../api/client';
import { Button, ChoiceChips, ErrorText, Field, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useLanguage } from '../../../../i18n';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { useLocalSearchParams } from 'expo-router';
import { sessionStore } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { calendarNew as page } from './page';

// The form to add a plan, and (opened with the plan's values) to change one. The wall-clock time is the
// person's own local time; the phone knows its offset and sends it with the moment.
const KINDS: CalendarKind[] = ['medicine', 'appointment', 'exercise', 'event', 'other'];
const REPEATS: CalendarRepeat[] = ['none', 'daily', 'weekdays', 'weekly'];
const REMINDS = ['0', '15', '30', '60'];
// The server's refusal codes and the words of this page that answer them.
const CODE_KEYS: Record<string, string> = {
  no_access: 'noAccess',
  not_found: 'notFound',
  range_too_large: 'rangeTooLarge',
  time_needs_offset: 'timeNeedsOffset',
  not_an_occurrence: 'notAnOccurrence',
};

export default function CalendarNew() {
  const w = usePageWords(page);
  const lang = useLanguage();
  const go = useNavigate();
  const { status } = useStore(sessionStore);
  const p = useLocalSearchParams() as { person?: string; edit?: string; title?: string; kind?: string; note?: string; date?: string; time?: string; repeat?: string; days?: string; until?: string; remind?: string };

  const [people, setPeople] = useState<CalendarPerson[]>([]);
  const [who, setWho] = useState<string | null>(p.person || null);
  const [kind, setKind] = useState<CalendarKind>((p.kind as CalendarKind) || 'medicine');
  const [title, setTitle] = useState(p.title ?? '');
  const [note, setNote] = useState(p.note ?? '');
  const [date, setDate] = useState(p.date ?? '');
  const [time, setTime] = useState(p.time ?? '');
  const [repeat, setRepeat] = useState<CalendarRepeat>((p.repeat as CalendarRepeat) || 'none');
  const [weekDays, setWeekDays] = useState<number[]>(p.days ? p.days.split(',').map((n: string) => Number(n)).filter((n) => n >= 0 && n <= 6) : []);
  const [until, setUntil] = useState(p.until ?? '');
  const [remind, setRemind] = useState(p.remind ?? '0');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ id: string; warnings: Clash[] } | null>(null); // kept, with its heads-ups

  const editing = !!p.edit;

  // Switching to chosen days preselects the day of the chosen date, so the plan keeps happening on it.
  // The server counts 0=Monday .. 6=Sunday; JavaScript's getDay() counts 0=Sunday, hence the +6 wrap.
  const pickRepeat = (v: string) => {
    setRepeat(v as CalendarRepeat);
    if (v === 'weekly' && weekDays.length === 0 && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setWeekDays([(new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))).getDay() + 6) % 7]);
    }
  };

  useEffect(() => {
    if (status !== 'in' || editing) return;
    calendarApi.people().then((r) => {
      setPeople(r.people);
      setWho((cur) => cur ?? r.people[0]?.id ?? null);
    }).catch(() => setError(w('failed')));
  }, [status, editing, w]);

  // The labels of the seven days, in the person's language, from a known Monday.
  const dayLabels = [0, 1, 2, 3, 4, 5, 6].map((i) =>
    new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)));

  const save = useCallback(async () => {
    if (busy) return;
    if (title.trim().length === 0) return setError(w('needTitle'));
    const when = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)),
      Number(time.slice(0, 2)), Number(time.slice(3, 5)));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || Number.isNaN(when.getTime()) || when.getTime() === 0) {
      return setError(w('needWhen'));
    }
    setError(null);
    setBusy(true);
    const body = {
      kind,
      title: title.trim(),
      note: note.trim(), // an empty note clears it
      starts_at: when.toISOString(),
      repeat,
      repeat_days: repeat === 'weekly' ? weekDays : undefined,
      until_date: until || undefined,
      remind_before_min: Number(remind),
    };
    try {
      if (editing) {
        const r = await calendarApi.update(p.edit!, body);
        if (r.warnings.length) {
          setSaved({ id: r.id, warnings: r.warnings }); // shown below; the plan is already saved
          return;
        }
        go('calendar.item', { id: p.edit! });
      } else {
        const r = await calendarApi.create({ ...body, person_id: who ?? undefined });
        if (r.warnings.length) {
          setSaved({ id: r.id, warnings: r.warnings }); // shown below; the plan is already saved
          return;
        }
        go('calendar.today');
      }
    } catch (e) {
      setError(e instanceof ApiError && CODE_KEYS[e.code] ? w(CODE_KEYS[e.code]) : w('failed'));
    } finally {
      setBusy(false);
    }
  }, [busy, title, date, time, kind, note, repeat, weekDays, until, remind, who, editing, p.edit, w, go]);

  useField(page, 'title', title, (v) => setTitle(String(v)));
  useField(page, 'note', note, (v) => setNote(String(v)));
  useField(page, 'date', date, (v) => setDate(String(v)));
  useField(page, 'time', time, (v) => setTime(String(v)));
  useField(page, 'until', until, (v) => setUntil(String(v)));
  useAction(page, 'save', () => void save());

  // The plan is already on the calendar; the person just says the clash is fine.
  const keep = useCallback(() => {
    if (!saved) return;
    go(editing ? 'calendar.item' : 'calendar.today', editing ? { id: saved.id } : undefined);
  }, [saved, editing, go]);
  useAction(page, 'clashSave', keep);
  const wtime = (iso: string) => new Date(iso).toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' });

  return (
    <Screen title={editing ? w('editHeading') : w('newHeading')} back>
      {!editing && people.length > 1 ? (
        <El page={page} id="forWho">
          <ChoiceChips
            label={w('forPerson')}
            options={people.map((x) => ({ value: x.id, label: x.name || w('me') }))}
            value={who}
            onChange={(v) => setWho(v)}
          />
        </El>
      ) : null}
      <El page={page} id="kind">
        <ChoiceChips label={w('kind')} options={KINDS.map((k) => ({ value: k, label: w(`kind${k[0].toUpperCase()}${k.slice(1)}`) }))} value={kind} onChange={(v) => setKind(v as CalendarKind)} />
      </El>
      <El page={page} id="title">
        <Field label={w('title')} value={title} onChangeText={setTitle} placeholder={w('titlePlaceholder')} maxLength={120} />
      </El>
      <El page={page} id="note">
        <Field label={w('note')} value={note} onChangeText={setNote} placeholder={w('notePlaceholder')} maxLength={500} />
      </El>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <El page={page} id="date">
            <Field label={w('date')} value={date} onChangeText={setDate} keyboardType="numeric" maxLength={10} />
          </El>
        </View>
        <View style={{ flex: 1 }}>
          <El page={page} id="time">
            <Field label={w('time')} value={time} onChangeText={setTime} keyboardType="numeric" maxLength={5} />
          </El>
        </View>
      </View>
      <El page={page} id="repeat">
        <ChoiceChips label={w('repeat')} options={REPEATS.map((r) => ({ value: r, label: w(`repeat${r[0].toUpperCase()}${r.slice(1)}`) }))} value={repeat} onChange={pickRepeat} />
      </El>
      {repeat === 'weekly' ? (
        <El page={page} id="someDays">
          <View>
            <Text style={[type.small, { color: colors.muted, marginBottom: space.xs }]}>{w('someDays')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
              {dayLabels.map((label, i) => {
                const on = weekDays.includes(i);
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    onPress={() => setWeekDays((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i].sort((a, b) => a - b)))}
                    style={{
                      paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: 999,
                      backgroundColor: on ? colors.accent : colors.card, borderWidth: 1, borderColor: on ? colors.accent : colors.line,
                    }}
                  >
                    <Text style={{ color: on ? '#fff' : colors.ink, fontWeight: '600', fontSize: 14 }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </El>
      ) : null}
      <El page={page} id="until">
        <Field label={w('until')} value={until} onChangeText={setUntil} keyboardType="numeric" maxLength={10} />
      </El>
      <El page={page} id="remind">
        <ChoiceChips label={w('remind')} options={REMINDS.map((r) => ({ value: r, label: w(`remind${r === '0' ? '0' : r}`) }))} value={remind} onChange={setRemind} />
      </El>
      {kind === 'medicine' ? (
        <El page={page} id="notMedical">
          <Text style={[type.small, { color: colors.muted, marginTop: space.md }]}>{w('notMedical')}</Text>
        </El>
      ) : null}
      <ErrorText>{error}</ErrorText>
      {saved ? (
        <View style={{ gap: space.sm, marginTop: space.md }}>
          <Text style={{ fontWeight: '800', color: colors.ink }}>{w('clashHeading')}</Text>
          {saved.warnings.map((cl) => (
            <Text key={`${cl.with_title}|${cl.with_at}`} style={[type.body, { color: colors.muted }]}>
              {cl.why === 'duplicate'
                ? w('clashDup', { title: cl.with_title })
                : w('clashEvent', { n: cl.gap_min, title: cl.with_title, time: wtime(cl.with_at) })}
            </Text>
          ))}
          <El page={page} id="clashSave">
            <Button label={w('clashSave')} onPress={keep} icon="checkmark" />
          </El>
        </View>
      ) : (
        <View style={{ marginTop: space.md }}>
          <El page={page} id="save">
            <Button label={w('save')} onPress={() => void save()} disabled={busy} />
          </El>
        </View>
      )}
    </Screen>
  );
}


