// Session Details (revamp v2, A2): who it is with and the topic, when and where, Start Video Call (there is no video calling yet: it says
// "Coming soon") and Reschedule Session side by side, "We had this session" (a leaf for both), and the chat with the other person:
// the introduction's messages as alternating bubbles, large text, a big send button.
import { Ionicons } from '@expo/vector-icons';
import { useLiveEpoch } from '../../../core/useFocusLive';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { completeSession, getConnectionMessages, getSessions, rescheduleSession, sendConnectionMessage, type WisdomMessage, type WisdomSession } from '../../../api/wisdom';
import { BackScreen } from '../../../components/BackButton';
import { refreshWisdom } from '../../grow/wisdomStore';
import { SkeletonList } from '../../../components/Skeleton';
import { useLanguage, useT } from '../../../i18n';
import { El, useAction, useField } from '../../../kit';
import { useStore } from '../../../core/store';
import { sessionStore } from '../../../session/store';
import { colors, radius, space } from '../../../theme/tokens';
import { clock, dayWord, whenWords, type Lang } from '../../community/when';
import { wisdomSession as page } from '../pages';
import { Avatar, BigButton, BLUE, Calm, card, Heading, Result, StatusWord } from '../teachUi';

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TIMES = Array.from({ length: 27 }, (_, i) => 7 * 60 + i * 30); // 7:00 to 20:00, every half hour
const hhmm = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
/** The day and time a person picked, as a moment in their own time zone. */
const at = (day: string, time: string) => { const [y, m, d] = day.split('-').map(Number); const [h, mi] = time.split(':').map(Number); return new Date(y, m - 1, d, h, mi); };

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start', marginTop: space.sm }}>
      <Ionicons name={icon} size={24} color={BLUE} style={{ marginTop: 2 }} accessible={false} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: colors.muted }}>{label}</Text>
        <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink }}>{value}</Text>
      </View>
    </View>
  );
}

export default function SessionScreen() {
  const t = useT();
  const lang = useLanguage() as Lang;
  const { id } = useLocalSearchParams<{ id: string }>();
  const [s, setS] = useState<WisdomSession | null | undefined>(undefined);
  const [msgs, setMsgs] = useState<WisdomMessage[] | null>(null);
  const [text, setText] = useState('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [day, setDay] = useState(() => ymd(new Date(Date.now() + 86400000)));
  const [time, setTime] = useState('10:00');
  const [busy, setBusy] = useState<string | null>(null);

  const { status } = useStore(sessionStore);
  const liveEpoch = useLiveEpoch();
  useEffect(() => {
    if (status !== 'in') return;
    let live = true;
    getSessions().then((all) => { if (live) setS(all.find((x) => x.id === id) ?? null); }).catch(() => { if (live) setS(null); });
    return () => { live = false; };
  }, [id, status, liveEpoch]);
  const readChat = useCallback((cid: string) => getConnectionMessages(cid).then(setMsgs).catch(() => setMsgs([])), []);
  const cid = s?.connection_id;
  useEffect(() => { if (cid) void readChat(cid); }, [cid, readChat]);

  const video = () => setNote({ ok: false, text: t('wt.coming_soon') });
  const openPicker = () => { setNote(null); setPicking(true); };
  const moveIt = async () => {
    if (!s) return;
    setBusy('move');
    try {
      const next = await rescheduleSession(s.id, at(day, time).toISOString());
      setS(next); setPicking(false);
      setNote({ ok: true, text: t('wt.moved', { when: whenWords(next.starts_at, lang) }) });
    } catch {
      setNote({ ok: false, text: t('wt.save_failed') });
    } finally { setBusy(null); }
  };
  const markDone = async () => {
    if (!s) return;
    setBusy('done');
    try { setS(await completeSession(s.id)); setNote({ ok: true, text: t('wt.done_msg') }); void refreshWisdom(); } catch { setNote({ ok: false, text: t('wt.save_failed') }); } finally { setBusy(null); }
  };
  const send = async () => {
    if (!s || !text.trim()) return;
    setBusy('send');
    try { await sendConnectionMessage(s.connection_id, text.trim()); setText(''); await readChat(s.connection_id); } catch { setNote({ ok: false, text: t('wt.save_failed') }); } finally { setBusy(null); }
  };

  useAction(page, 'video', video);
  useAction(page, 'reschedule', openPicker);
  useField(page, 'newDay', day, (v) => { if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) setDay(String(v)); });
  useField(page, 'newTime', time, (v) => { if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(String(v))) setTime(String(v).padStart(5, '0')); });
  useAction(page, 'moveIt', moveIt);
  useAction(page, 'markDone', markDone);
  useField(page, 'message', text, (v) => setText(String(v ?? '').slice(0, 500)));
  useAction(page, 'send', send);

  const now = new Date();
  const days = Array.from({ length: 14 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i + 1));

  return (
    <BackScreen title={t('wt.session_title')}>
      {s === undefined ? <SkeletonList count={2} /> : s === null ? <Calm text={t('wt.not_found')} /> : (
        <View style={{ paddingBottom: space.xl }}>
          <View style={[card, { padding: space.lg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Avatar name={s.with_name} size={60} group={!!s.group_name && s.role === 'teacher'} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 16, color: colors.muted }}>{s.role === 'teacher' ? t('wt.learner') : t('wt.mentor')}</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>{s.with_name}</Text>
              </View>
              <StatusWord tone={s.status === 'scheduled' ? 'soon' : 'done'} text={t(`wt.status_${s.status}`)} />
            </View>
            <Row icon="school-outline" label={t('wt.topic')} value={s.title} />
            <Row icon="time-outline" label={t('wt.when')} value={whenWords(s.starts_at, lang)} />
            <Row icon="location-outline" label={t('wt.where')} value={s.place ?? t('wt.online')} />
            {s.status === 'scheduled' ? (
              <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
                <View style={{ flex: 1 }}><El page={page} id="video"><BigButton icon="videocam" label={t('wt.video')} onPress={video} /></El></View>
                <View style={{ flex: 1 }}><El page={page} id="reschedule"><BigButton kind="outline" icon="calendar" label={t('wt.reschedule')} onPress={openPicker} /></El></View>
              </View>
            ) : null}
            {note ? <Result ok={note.ok} text={note.text} /> : null}
          </View>

          {picking && s.status === 'scheduled' ? (
            <View style={[card, { marginTop: space.md, padding: space.lg }]}>
              <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink }}>{t('wt.pick_day')}</Text>
              <El page={page} id="newDay">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: space.sm }}>
                  {days.map((d) => {
                    const on = ymd(d) === day;
                    return (
                      <Pressable key={ymd(d)} onPress={() => setDay(ymd(d))} accessibilityRole="radio" accessibilityState={{ selected: on }}
                        style={{ minHeight: 64, minWidth: 92, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.button, borderWidth: 2, borderColor: on ? BLUE : colors.line, backgroundColor: on ? BLUE : colors.card }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: on ? colors.card : colors.ink }}>{dayWord(d, now, lang)}</Text>
                        <Text style={{ fontSize: 15, color: on ? colors.card : colors.muted }}>{d.getDate()}/{d.getMonth() + 1}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </El>
              <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink, marginTop: space.sm }}>{t('wt.pick_time')}</Text>
              <El page={page} id="newTime">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: space.sm }}>
                  {TIMES.map((n) => {
                    const v = hhmm(n);
                    const on = v === time;
                    return (
                      <Pressable key={v} onPress={() => setTime(v)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                        style={{ minHeight: 56, minWidth: 92, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 2, borderColor: on ? BLUE : colors.line, backgroundColor: on ? BLUE : colors.card }}>
                        <Text style={{ fontSize: 17, fontWeight: '800', color: on ? colors.card : colors.ink }}>{clock(at(day, v), lang)}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </El>
              <View style={{ gap: space.sm, marginTop: space.md }}>
                <El page={page} id="moveIt"><BigButton icon="checkmark" label={t('wt.move_it', { when: whenWords(at(day, time).toISOString(), lang) })} busy={busy === 'move'} onPress={() => void moveIt()} /></El>
                <BigButton kind="outline" icon="close" tone={colors.ink} label={t('wt.close')} onPress={() => setPicking(false)} />
              </View>
            </View>
          ) : null}

          {s.status === 'scheduled' ? (
            <View style={{ marginTop: space.md }}>
              <El page={page} id="markDone"><BigButton kind="outline" icon="checkmark-done" label={t('wt.mark_done')} busy={busy === 'done'} onPress={() => void markDone()} /></El>
            </View>
          ) : null}

          <Heading text={t('wt.chat_with', { name: s.with_name })} />
          {msgs === null ? <SkeletonList count={2} /> : msgs.length === 0 ? <Calm text={t('wt.no_messages')} /> : (
            <View style={{ gap: space.sm }}>
              {msgs.map((m) => (
                <View key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '86%', borderRadius: 20, borderBottomRightRadius: m.mine ? 6 : 20, borderBottomLeftRadius: m.mine ? 20 : 6,
                  paddingHorizontal: space.md, paddingVertical: space.sm + 2, backgroundColor: m.mine ? BLUE : '#EDEFF3' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: m.mine ? '#DCE6F7' : colors.muted }}>{m.mine ? t('wt.you') : m.from}</Text>
                  <Text style={{ fontSize: 19, lineHeight: 27, color: m.mine ? colors.card : colors.ink }}>{m.body}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginTop: space.md }}>
            <View style={{ flex: 1 }}>
              <El page={page} id="message">
                <TextInput value={text} onChangeText={setText} maxLength={500} multiline placeholder={t('wt.message')} placeholderTextColor={colors.muted} accessibilityLabel={t('wt.message')}
                  style={{ minHeight: 60, maxHeight: 160, borderWidth: 2, borderColor: colors.line, borderRadius: radius.button, paddingHorizontal: space.md, paddingVertical: space.sm, fontSize: 19, color: colors.ink, backgroundColor: colors.card }} />
              </El>
            </View>
            <El page={page} id="send">
              <Pressable onPress={() => void send()} disabled={!text.trim() || busy === 'send'} accessibilityRole="button" accessibilityLabel={t('wt.send')}
                style={({ pressed }) => ({ minHeight: 60, minWidth: 96, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.button, backgroundColor: BLUE, opacity: !text.trim() ? 0.5 : pressed ? 0.85 : 1 })}>
                <Ionicons name="send" size={22} color={colors.card} accessible={false} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.card }}>{t('wt.send')}</Text>
              </Pressable>
            </El>
          </View>
        </View>
      )}
    </BackScreen>
  );
}
