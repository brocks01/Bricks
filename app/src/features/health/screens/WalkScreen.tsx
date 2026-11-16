import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { saveWalk } from '../../../api/health';
import { Figure, Notice, Pill } from '../../../components/blocks';
import { Button, ErrorText } from '../../../components/ui';
import { BackScreen } from '../../../components/BackButton';
import { useT } from '../../../i18n';
import { El, useAction, usePageData, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { colors, space, type } from '../../../theme/tokens';
import { WalkSession, type WalkProgress } from '../walk/engine';
import { GpsSource, gpsAvailable, PracticeSource } from '../walk/sources';
import { healthWalk as page } from '../pages';
import { clock, km, paceParts } from '../format';

type Phase = 'idle' | 'running' | 'summary';
interface Summary { started_at: string; duration_s: number; moving_s: number; distance_m: number; steps: number; practice: boolean }

export default function WalkScreen() {
  const w = usePageWords(page);
  const t = useT();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState<WalkProgress | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [practice, setPractice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const session = useRef<WalkSession | null>(null);

  useEffect(() => () => session.current?.discard(), []); // leaving the page never leaves a walk running

  const begin = useCallback(
    (isPractice: boolean) => {
      setError(null);
      if (!isPractice && !gpsAvailable()) return setError(w('gps_unavailable'));
      const source = isPractice ? new PracticeSource() : new GpsSource((why) => setError(why === 'denied' ? w('gps_denied') : w('gps_unavailable')));
      const s = new WalkSession({ source, onProgress: setProgress });
      session.current = s;
      setPractice(isPractice);
      setPhase('running');
      s.start();
    },
    [w]
  );

  const finish = useCallback(() => {
    const s = session.current;
    if (!s) return;
    const p = s.progress();
    const up = s.finish();
    session.current = null;
    const duration = Math.max(1, Math.round((Date.parse(up.ended_at) - Date.parse(up.started_at)) / 1000));
    setSummary({ started_at: up.started_at, duration_s: duration, moving_s: Math.min(duration, p.active_s), distance_m: Math.round(p.distance_m), steps: up.steps, practice });
    setPhase('summary');
  }, [practice]);

  const discard = useCallback(() => {
    session.current?.discard();
    session.current = null;
    setProgress(null);
    setSummary(null);
    setPhase('idle');
  }, []);

  const save = useCallback(async () => {
    if (!summary) return;
    if (summary.duration_s < 10) return setError(w('too_short'));
    setSaving(true);
    setError(null);
    try {
      await saveWalk({ started_at: summary.started_at, duration_s: summary.duration_s, moving_s: summary.moving_s, distance_m: summary.distance_m, steps: summary.steps });
      navigate('health.history');
    } catch {
      setError(w('failed'));
    } finally {
      setSaving(false);
    }
  }, [summary, navigate, w]);

  const togglePause = useCallback(() => {
    const s = session.current;
    if (!s) return;
    if (progress?.paused) s.resume();
    else s.pause();
  }, [progress?.paused]);

  useAction(page, 'startGps', () => begin(false));
  useAction(page, 'startPractice', () => begin(true));
  useAction(page, 'pause', () => session.current?.pause());
  useAction(page, 'resume', () => session.current?.resume());
  useAction(page, 'finishWalk', finish);
  useAction(page, 'discard', discard);
  useAction(page, 'saveWalk', save);

  usePageData(page, {
    values: phase === 'idle' ? [] : [
      { label: w('time'), value: clock(phase === 'running' ? progress?.active_s ?? 0 : summary?.moving_s ?? 0) },
      { label: w('distance'), value: `${km(phase === 'running' ? progress?.distance_m ?? 0 : summary?.distance_m ?? 0)} ${w('km')}` },
      { label: w('steps'), value: String(phase === 'running' ? progress?.steps ?? 0 : summary?.steps ?? 0) },
    ],
    images: [],
    lists: [],
    actions: [],
  });

  const shown = phase === 'summary' && summary ? { time: summary.moving_s, dist: summary.distance_m, steps: summary.steps } : { time: progress?.active_s ?? 0, dist: progress?.distance_m ?? 0, steps: progress?.steps ?? 0 };
  const pace = summary && summary.distance_m >= 100 ? paceParts(summary.moving_s / (summary.distance_m / 1000)) : null;

  return (
    <BackScreen title={w('heading')}>
      <ErrorText>{error}</ErrorText>

      {phase === 'idle' ? (
        <View style={{ gap: space.md }}>
          <Notice text={w('walk_note')} />
          <El page={page} id="startGps">
            <Button label={w('walk_gps')} icon="navigate-outline" onPress={() => begin(false)} />
          </El>
          <El page={page} id="startPractice">
            <Button label={w('walk_practice')} kind="plain" icon="walk-outline" onPress={() => begin(true)} />
          </El>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          {phase === 'summary' ? <Text style={[type.h1, { color: colors.accent }]}>{w('walk_done')}</Text> : null}
          {practice ? <Pill text={w('practice_badge')} tone="warn" /> : null}
          <View style={{ alignItems: 'center', paddingVertical: space.lg }}>
            <Text style={{ fontSize: 56, fontWeight: '800', color: colors.ink }} accessibilityLiveRegion="polite">{clock(shown.time)}</Text>
            <Text style={[type.small, { color: colors.muted }]}>{w('time')}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Figure icon="navigate-outline" n={km(shown.dist)} label={`${w('distance')} (${w('km')})`} />
            <Figure icon="footsteps-outline" n={shown.steps} label={w('steps')} />
            {pace ? <Figure icon="speedometer-outline" n={w('pace_val', { m: pace.m, s: pace.s })} label={w('pace')} /> : null}
          </View>
          {phase === 'running' && progress?.autoPaused ? <Text style={[type.small, { color: colors.warn }]}>{w('auto_paused')}</Text> : null}
          {phase === 'running' && progress?.paused ? <Text style={[type.small, { color: colors.warn }]}>{w('paused')}</Text> : null}

          {phase === 'running' ? (
            <View style={{ gap: space.sm }}>
              <El page={page} id={progress?.paused ? 'resume' : 'pause'}>
                <Button label={progress?.paused ? w('resume') : w('pause')} kind="plain" onPress={togglePause} icon={progress?.paused ? 'play' : 'pause'} />
              </El>
              <El page={page} id="finishWalk">
                <Button label={w('finish')} onPress={finish} icon="flag" />
              </El>
            </View>
          ) : (
            <View style={{ gap: space.sm }}>
              <El page={page} id="saveWalk">
                <Button label={saving ? t('common.loading') : w('save_walk')} disabled={saving} onPress={save} icon="checkmark" />
              </El>
              <El page={page} id="discard">
                <Button label={w('discard')} kind="plain" onPress={discard} />
              </El>
            </View>
          )}
        </View>
      )}
    </BackScreen>
  );
}
