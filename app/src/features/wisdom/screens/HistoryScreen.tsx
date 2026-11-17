// Session History and Completed Reviews (revamp v2, A2): every completed session, newest first, with "Score: {n}/5" and the learner's note.
// A session not reviewed yet says so; when the person was the learner, they can give their score from 1 to 5 and a short note here.
import { useEffect, useState } from 'react';
import { useLiveEpoch } from '../../../core/useFocusLive';
import { Pressable, Text, TextInput, View } from 'react-native';
import { getSessions, reviewSession, type WisdomSession } from '../../../api/wisdom';
import { BackScreen } from '../../../components/BackButton';
import { SkeletonList } from '../../../components/Skeleton';
import { useLanguage, useT } from '../../../i18n';
import { El, useAction, useField } from '../../../kit';
import { useStore } from '../../../core/store';
import { sessionStore } from '../../../session/store';
import { colors, radius, space } from '../../../theme/tokens';
import { dayHeading, type Lang } from '../../community/when';
import { wisdomHistory as page } from '../pages';
import { BigButton, BLUE, Calm, card, Result, StatusWord } from '../teachUi';

/** The review of the first session waiting for one (one form at a time, so the agent's fields are never in two places). */
function ReviewForm({ s, onDone }: { s: WisdomSession; onDone: (next: WisdomSession) => void }) {
  const t = useT();
  const [score, setScore] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const send = async () => {
    if (!score) return;
    setBusy(true); setFailed(false);
    try { onDone(await reviewSession(s.id, score, note.trim() || undefined)); } catch { setFailed(true); } finally { setBusy(false); }
  };
  useField(page, 'reviewScore', String(score ?? ''), (v) => { const n = Number(v); if (n >= 1 && n <= 5) setScore(n); });
  useField(page, 'reviewNote', note, (v) => setNote(String(v ?? '').slice(0, 500)));
  useAction(page, 'sendReview', send);
  return (
    <View style={{ marginTop: space.md, gap: space.sm }}>
      <Text style={{ fontSize: 18, lineHeight: 25, fontWeight: '700', color: colors.ink }}>{t('wt.rate')}</Text>
      <El page={page} id="reviewScore">
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = score === n;
        return (
          <Pressable key={n} onPress={() => setScore(n)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={t('wt.score', { n })}
            style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderRadius: radius.button, borderWidth: 2, borderColor: on ? BLUE : colors.line, backgroundColor: on ? BLUE : colors.card }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: on ? colors.card : colors.ink }}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
      </El>
      <El page={page} id="reviewNote">
      <TextInput value={note} onChangeText={setNote} maxLength={500} multiline placeholder={t('wt.review_note')} placeholderTextColor={colors.muted} accessibilityLabel={t('wt.review_note')}
        style={{ minHeight: 88, borderWidth: 2, borderColor: colors.line, borderRadius: radius.button, padding: space.md, fontSize: 18, color: colors.ink, textAlignVertical: 'top' }} />
      </El>
      {failed ? <Result ok={false} text={t('wt.save_failed')} /> : null}
      <El page={page} id="sendReview"><BigButton icon="send" label={t('wt.send_review')} disabled={!score} busy={busy} onPress={() => void send()} /></El>
    </View>
  );
}

export default function HistoryScreen() {
  const t = useT();
  const lang = useLanguage() as Lang;
  const [list, setList] = useState<WisdomSession[] | null>(null);
  const [failed, setFailed] = useState(false);

  const { status } = useStore(sessionStore);
  const liveEpoch = useLiveEpoch();
  useEffect(() => {
    if (status !== 'in') return;
    let live = true;
    getSessions()
      .then((all) => { if (live) setList(all.filter((s) => s.status === 'completed').sort((a, b) => b.starts_at.localeCompare(a.starts_at))); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [status, liveEpoch]);

  const firstToReview = list?.find((s) => s.can_review)?.id;
  const replace = (next: WisdomSession) => setList((l) => (l ?? []).map((x) => (x.id === next.id ? next : x)));

  return (
    <BackScreen title={t('wt.history_title')}>
      {failed ? <Calm text={t('wt.failed')} /> : !list ? <SkeletonList /> : !list.length ? <Calm text={t('wt.no_history')} /> : (
        <View style={{ gap: space.md, paddingBottom: space.xl }}>
          {list.map((s) => (
            <View key={s.id} style={[card, { padding: space.lg, gap: 4 }]}>
              <StatusWord tone="done" text={t('wt.status_completed')} />
              <Text style={{ fontSize: 21, fontWeight: '800', color: colors.ink }}>{s.title}</Text>
              <Text style={{ fontSize: 16, color: colors.muted }}>{`${dayHeading(s.starts_at, lang)} · ${t('wt.with_name', { name: s.with_name })}`}</Text>
              {s.review ? (
                <>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: BLUE, marginTop: space.sm }}>{t('wt.score', { n: s.review.score })}</Text>
                  {s.review.note ? <Text style={{ fontSize: 18, lineHeight: 26, color: colors.ink }}>“{s.review.note}”</Text> : null}
                </>
              ) : (
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.muted, marginTop: space.sm }}>{t('wt.not_reviewed')}</Text>
              )}
              {s.id === firstToReview ? <ReviewForm s={s} onDone={replace} /> : null}
            </View>
          ))}
        </View>
      )}
    </BackScreen>
  );
}
