import { useKeepAwake } from 'expo-keep-awake';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, BackHandler, Linking, StyleSheet, View } from 'react-native';

import { useUploadWalk } from '@/api';
import {
  BigButton,
  BigStatsList,
  ButtonRow,
  ConfirmSheet,
  FlagCheckeredIcon,
  PauseIcon,
  PlayIcon,
  RouteMap,
  Screen,
  StatusBanner,
} from '@/components';
import { clearUnfinishedWalk, useActiveWalk } from '@/features/walk/activeWalk';
import { prepareWalkLocation } from '@/features/walk/gpsTrack';
import { formatClock, formatCount, formatDistance, sayDistance, sayMinutes } from '@/lib/format';
import { platform } from '@/lib/platform';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/**
 * S22 Walk recording (Strava record, simplified): the route so far, three big
 * numbers (Time, Distance, Steps; no pace or heart rate), Pause / Carry on and
 * Finish. Opens full-screen without the tab bar, so a stray tap can't leave a
 * walk half-way. Help stays top-right; the walk keeps recording under SOS.
 *
 * GPS walks ask for location when the walk starts (not before). If location is
 * off or refused, the screen says so in plain words and tries again by itself
 * when they come back from Settings. `?eventId=` links the walk to a group walk
 * ("Walked with" on everyone's summary).
 */
type Access = 'starting' | 'recording' | 'off' | 'denied';

export default function WalkRecordScreen() {
  useKeepAwake();
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const walk = useActiveWalk();
  const upload = useUploadWalk();
  const [confirming, setConfirming] = useState(false);
  // A walk already running, or the simulated walk (no permission needed): recording at once.
  const [access, setAccess] = useState<Access>(() => {
    const s = useActiveWalk.getState();
    return s.session || s.source !== 'gps' ? 'recording' : 'starting';
  });
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );
  // Buddy's "stop the walk" asks the Finish question here (adjusting state while
  // rendering, React's pattern for responding to a change from outside).
  const finishAsked = useActiveWalk((s) => s.finishAsked);
  const [answeredAsk, setAnsweredAsk] = useState(0);
  if (finishAsked > answeredAsk) {
    setAnsweredAsk(finishAsked);
    setConfirming(true);
  }

  // Start as soon as the screen opens: "Start walk" is one tap.
  const begin = useCallback(() => {
    const state = useActiveWalk.getState();
    if (state.session) return;
    const options = { eventId: typeof eventId === 'string' ? eventId : null };
    if (state.source !== 'gps') return state.start(options);
    void prepareWalkLocation().then((location) => {
      // They left while the permission question was open: don't start a walk with no screen.
      if (!mounted.current) return;
      if (location.status !== 'ready') return setAccess(location.status);
      useActiveWalk.getState().start({ ...options, background: location.background });
      setAccess('recording');
    });
  }, [eventId]);

  useEffect(begin, [begin]);

  const retry = useCallback(() => {
    setAccess('starting');
    begin();
  }, [begin]);

  // Back from Settings with location allowed: start without another tap.
  useEffect(() => {
    if (access !== 'off' && access !== 'denied') return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') retry();
    });
    return () => sub.remove();
  }, [access, retry]);

  const recording = access === 'recording';

  // Android Back asks before ending the walk, like the Finish button.
  useFocusEffect(
    useCallback(() => {
      if (!recording) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        setConfirming(true);
        return true;
      });
      return () => sub.remove();
    }, [recording]),
  );

  const progress = walk.progress;
  const time = formatClock(progress?.active_s ?? 0);
  const distance = formatDistance(progress?.distance_m ?? 0, language);
  const steps = formatCount(progress?.steps ?? 0, language);
  const paused = progress?.paused ?? false;

  const finish = () => {
    setConfirming(false);
    const data = useActiveWalk.getState().finish();
    if (!data) return router.back();
    upload.mutate(data, {
      onSuccess: (summary) => {
        void clearUnfinishedWalk();
        router.replace({ pathname: '/walk/[id]', params: { id: summary.id } });
      },
      // Kept on the phone: Thrive offers "Save that walk" next time.
      onError: () => router.back(),
    });
  };

  const readOut = () =>
    t(paused ? 'walk.readoutPaused' : 'walk.readout', {
      time: sayMinutes(progress?.active_s ?? 0, t),
      distance: sayDistance(progress?.distance_m ?? 0, language, t),
      steps,
    });

  if (!recording) {
    const message =
      access === 'off'
        ? t('walk.locationOff')
        : access === 'denied'
          ? t('walk.locationDenied')
          : t('walk.findingYou');
    return (
      <Screen
        title={t('walk.recording')}
        readOut={() => message}
        standalone
        testID="screen-walk-record"
        footer={
          access === 'starting' ? null : (
            <ButtonRow>
              <BigButton
                size="lg"
                variant="outline"
                label={t('common.tryAgain')}
                onPress={retry}
                testID="walk-location-retry"
              />
              <BigButton
                size="lg"
                label={t('walk.openSettings')}
                onPress={() => void Linking.openSettings().catch(() => {})}
                testID="walk-location-settings"
              />
            </ButtonRow>
          )
        }
      >
        <StatusBanner
          tone={access === 'starting' ? 'info' : 'notice'}
          text={message}
          testID={`walk-location-${access}`}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={t('walk.recording')}
      readOut={readOut}
      back={false}
      standalone
      // Hands-free: "stop the walk" works from here too.
      tellMe
      testID="screen-walk-record"
      footer={
        <ButtonRow>
          <BigButton
            size="lg"
            variant="outline"
            icon={paused ? PlayIcon : PauseIcon}
            label={paused ? t('walk.resume') : t('walk.pause')}
            onPress={paused ? walk.resume : walk.pause}
            disabled={upload.isPending}
            testID="walk-pause"
          />
          <BigButton
            size="lg"
            icon={FlagCheckeredIcon}
            label={upload.isPending ? t('walk.saving') : t('walk.finish')}
            onPress={() => setConfirming(true)}
            disabled={upload.isPending}
            testID="walk-finish"
          />
        </ButtonRow>
      }
    >
      <RouteMap points={progress?.points ?? []} live label={t('walk.recording')} height={220} />

      {paused ? <StatusBanner tone="info" text={t('walk.paused')} testID="walk-paused" /> : null}
      {!paused && progress?.autoPaused ? (
        <StatusBanner tone="info" text={t('walk.autoPaused')} testID="walk-auto-paused" />
      ) : null}

      <View style={styles.stats}>
        <BigStatsList
          stats={[
            { label: t('walk.time'), value: time },
            { label: t('walk.distance'), value: distance },
            { label: t('walk.steps'), value: steps },
          ]}
          testID="walk-stats"
        />
      </View>

      {platform.canRecordInBackground ? null : (
        <StatusBanner tone="notice" text={t('walk.keepOpen')} testID="walk-keep-open" />
      )}
      {upload.isError ? <StatusBanner tone="notice" text={t('walk.saveFailed')} /> : null}

      <ConfirmSheet
        visible={confirming}
        text={t('walk.finishConfirm')}
        onYes={finish}
        onNo={() => setConfirming(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: {
    marginTop: space.xs,
  },
});
