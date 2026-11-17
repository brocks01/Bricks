import { Ionicons } from '@expo/vector-icons';
import { useLiveEpoch } from '../../../../core/useFocusLive';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { calendarApi, type CalendarItem, type Occurrence } from '../../../../api/calendar';
import { ApiError } from '../../../../api/client';
import { Button, ErrorText, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useLanguage } from '../../../../i18n';
import { El, useAction, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { calendarItem as page } from './page';

// One plan in full. The times below are the marks of this week; Change reopens the form with the plan's
// values, and cancelling keeps the record but stops every future day.
const CODE_KEYS: Record<string, string> = {
  no_access: 'noAccess',
  not_found: 'notFound',
  range_too_large: 'rangeTooLarge',
  time_needs_offset: 'timeNeedsOffset',
  not_an_occurrence: 'notAnOccurrence',
};

export default function CalendarItemScreen() {
  const w = usePageWords(page);
  const lang = useLanguage();
  const go = useNavigate();
  const { status } = useStore(sessionStore);
  const { id } = useLocalSearchParams() as { id?: string };

  const [item, setItem] = useState<CalendarItem | null>(null);
  const [times, setTimes] = useState<Occurrence[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    calendarApi.item(id).then((it) => {
      setItem(it);
      return calendarApi.occurrences(it.person_id).then((r) => {
        setTimes(r.occurrences.filter((o) => o.item_id === id));
      });
    }).catch((e) => {
      setFailed(e instanceof ApiError && CODE_KEYS[e.code] ? w(CODE_KEYS[e.code]) : w('tryAgain'));
    });
  }, [id, w]);
  const liveEpoch = useLiveEpoch();
  useEffect(() => {
    if (status === 'in') load();
  }, [status, load, liveEpoch]);

  const cancel = useCallback(async () => {
    if (!item || busy) return;
    setBusy(true);
    try {
      await calendarApi.cancel(item.id);
      go('calendar.today');
    } catch (e) {
      setFailed(e instanceof ApiError && CODE_KEYS[e.code] ? w(CODE_KEYS[e.code]) : w('failed'));
    } finally {
      setBusy(false);
    }
  }, [item, busy, go, w]);

  useAction(page, 'cancelPlan', () => void cancel());

  const time = (iso: string) => new Date(iso).toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' });
  const day = (iso: string) => new Date(iso).toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' });
  const repeatWords = () => {
    if (!item) return '';
    if (item.repeat === 'daily') return w('everyDay');
    if (item.repeat === 'weekdays') return w('monToFri');
    if (item.repeat === 'weekly') {
      const names = (item.repeat_days ?? []).map((i) =>
        new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(new Date(2024, 0, 1 + i)));
      return `${w('someDays')}${names.length ? ': ' + names.join(', ') : ''}`;
    }
    return w('repeatNone');
  };
  const when = item ? `${item.first_date} ${item.local_time.slice(0, 5)}` : '';
  const untilWords = item?.until_date ? ' Â· ' + w('untilDay', { date: item.until_date }) : '';

  return (
    <Screen title={w('itemHeading')} back>
      {item === null && !failed ? null : item ? (
        <>
          <El page={page} id="when">
            <View style={{ gap: space.xs, marginBottom: space.md }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>{item.title}</Text>
              <Text style={[type.body, { color: colors.muted }]}>{`${w('when')}: ${when} Â· ${repeatWords()}${untilWords}`}</Text>
            </View>
          </El>
          {item.note ? (
            <El page={page} id="note">
              <Text style={[type.body, { color: colors.ink, marginBottom: space.md }]}>{item.note}</Text>
            </El>
          ) : null}
          <El page={page} id="addedBy">
            {item.added_by_name ? (
              <Text style={[type.small, { color: colors.muted, marginBottom: space.md }]}>
                {w('addedBy', { name: item.added_by_name })}
              </Text>
            ) : null}
          </El>

          {item.status === 'cancelled' ? (
            <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('cancelled')}</Text>
          ) : (
            <>
              <El page={page} id="times">
                <View style={{ gap: space.xs, marginBottom: space.md }}>
                  {times.length === 0 ? (
                    <Text style={[type.small, { color: colors.muted }]}>{w('empty')}</Text>
                  ) : times.map((o) => (
                    <View key={o.occurs_at} style={{
                      backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line,
                      padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md,
                    }}>
                      <Ionicons name="time" size={20} color={colors.accent} />
                      <Text style={[type.body, { color: colors.ink, flex: 1 }]}>{`${day(o.occurs_at)} Â· ${time(o.occurs_at)}`}</Text>
                      <Text style={[type.small, { color: o.status === 'done' ? colors.accent : colors.muted, fontWeight: '600' }]}>
                        {o.status === 'done' ? w('doneTag') : o.status === 'skipped' ? w('skippedTag') : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              </El>
              <El page={page} id="change">
                <Button
                  label={w('change')}
                  icon="create-outline"
                  kind="plain"
                  onPress={() => go('calendar.new', {
                    edit: item.id, person: item.person_id, title: item.title, kind: item.kind,
                    note: item.note ?? '', date: item.first_date, time: item.local_time.slice(0, 5),
                    repeat: item.repeat, days: (item.repeat_days ?? []).join(','), until: item.until_date ?? '',
                    remind: String(item.remind_before_min),
                  })}
                />
              </El>
              <View style={{ marginTop: space.sm }}>
                <El page={page} id="cancelPlan">
                  <Button label={w('cancelPlan')} icon="close" kind="danger" onPress={() => void cancel()} disabled={busy} />
                </El>
              </View>
            </>
          )}
        </>
      ) : null}
      {failed ? <ErrorText>{failed}</ErrorText> : null}
    </Screen>
  );
}

