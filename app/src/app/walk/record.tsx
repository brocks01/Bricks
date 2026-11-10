import { useKeepAwake } from 'expo-keep-awake';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, StyleSheet, View } from 'react-native';

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
import { formatClock, formatCount, formatDistance, formatMinutes } from '@/lib/format';
import { platform } from '@/lib/platform';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/**
 * S22 Walk recording (Strava record, simplified): the route so far, three big
 * numbers (Time, Distance, Steps; no pace or heart rate), Pause / Carry on and
 * Finish. Opens full-screen without the tab bar, so a stray tap can't leave a
 * walk half-way. Help stays top-right; the walk keeps recording under SOS.
 */
export default function WalkRecordScreen() {
  useKeepAwake();
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const walk = useActiveWalk();
  const upload = useUploadWalk();
  const [confirming, setConfirming] = useState(false);

  // Start as soon as the screen opens: "Start walk" is one tap.
  useEffect(() => {
    if (!useActiveWalk.getState().session) useActiveWalk.getState().start();
  }, []);

  // Android Back asks before ending the walk, like the Finish button.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        setConfirming(true);
        return true;
      });
      return () => sub.remove();
    }, []),
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
      time: formatMinutes(progress?.active_s ?? 0, t),
      distance,
      steps,
    });

  return (
    <Screen
      title={t('walk.recording')}
      readOut={readOut}
      back={false}
      standalone
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
