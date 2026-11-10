import { useRouter } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { useResolveSos, useSos, useTriggerSos } from '@/api';
import type { SosAlert } from '@/api/types';
import { BigButton, ConfirmSheet, PhoneIcon, Screen, StatusBanner, Text } from '@/components';
import { useReadOut } from '@/features/readout/ReadOutProvider';
import { config } from '@/lib/config';
import { formatDistance } from '@/lib/format';
import { warningFeedback } from '@/lib/haptics';
import { platform } from '@/lib/platform';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/** Seconds before the Safe Circle is told (time to cancel a mistaken tap). */
export const SOS_COUNTDOWN_S = 5;

/**
 * S28 SOS (Be My Eyes + SGDS): one obvious action, calm words.
 * 1. "Call 995 now" is always first and biggest (we offer 995 before anything else).
 * 2. A 5-second countdown, read aloud, with "Cancel, I'm OK" (nothing is sent).
 * 3. Then the Safe Circle is alerted and their replies show live:
 *    "Priya is on the way", "Ahmad (300 m away) is on the way".
 * 4. "I'm safe now" (confirmed first) tells everyone it's over.
 */
export default function SosScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const { speak } = useReadOut();
  const number = config.emergencyNumber;

  // Counted from when the screen opened, so the countdown stays honest even if the phone stutters.
  const [openedAt] = useState(() => Date.now());
  const [now, setNow] = useState(openedAt);
  const secondsLeft = Math.max(0, SOS_COUNTDOWN_S - Math.floor((now - openedAt) / 1000));
  const [callFailed, setCallFailed] = useState(false);
  const [confirmingSafe, setConfirmingSafe] = useState(false);
  const trigger = useTriggerSos();
  const resolve = useResolveSos();
  const alertId = trigger.data?.id ?? null;
  const sos = useSos(alertId);
  const alert: SosAlert | undefined = sos.data ?? trigger.data;
  const started = trigger.isPending || alertId !== null || trigger.isError;
  const counting = secondsLeft > 0 && !started;
  const resolved = alert?.status === 'resolved' || resolve.isSuccess;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  // Say what's happening straight away: they may not be able to read the screen.
  const announce = useEffectEvent(() => {
    warningFeedback();
    speak(t('sos.readout', { number, count: SOS_COUNTDOWN_S }));
  });
  useEffect(() => announce(), []);

  // The countdown; at zero, alert the Safe Circle.
  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [counting]);
  const sendAlert = useEffectEvent(() => trigger.mutate());
  useEffect(() => {
    if (secondsLeft === 0 && !started) sendAlert();
  }, [secondsLeft, started]);

  const call = async () => {
    try {
      await Linking.openURL(`tel:${number}`);
    } catch {
      // No dialler (tablet, simulator): show the number large instead.
      setCallFailed(true);
    }
  };

  const helperLine = (h: SosAlert['helpers'][number]) => {
    const name =
      h.distance_m !== null
        ? t('sos.away', {
            name: h.name.split(' ')[0],
            distance: formatDistance(h.distance_m, language),
          })
        : h.name.split(' ')[0]!;
    return t(`sos.helper.${h.status}`, { name });
  };

  const readOut = () =>
    alert
      ? t('sos.readoutSent', { statuses: alert.helpers.map(helperLine).join('. ') + '.' })
      : t('sos.readout', { number, count: secondsLeft });

  return (
    <Screen
      title={t('sos.title')}
      readOut={readOut}
      back={false}
      showHelp={false}
      standalone
      testID="screen-sos"
      footer={
        resolved ? (
          <BigButton label={t('common.done')} onPress={close} testID="sos-done" />
        ) : counting ? (
          <BigButton
            variant="outline"
            size="lg"
            label={t('sos.cancel')}
            onPress={close}
            testID="sos-cancel"
          />
        ) : alert ? (
          <BigButton
            variant="success"
            size="lg"
            label={t('sos.safeNow')}
            onPress={() => setConfirmingSafe(true)}
            testID="sos-safe"
          />
        ) : null
      }
    >
      <BigButton
        variant="sos"
        size="xl"
        icon={PhoneIcon}
        label={t('sos.call', { number })}
        accessibilityHint={t('sos.callHint')}
        disabled={!platform.canCallPhone}
        onPress={call}
        testID="sos-call"
      />
      {callFailed || !platform.canCallPhone ? (
        <Text variant="stat" align="center" selectable>
          {number}
        </Text>
      ) : null}

      <View style={styles.status} accessibilityLiveRegion="assertive">
        {counting ? (
          <Text variant="heading" testID="sos-countdown">
            {t('sos.countdown', { count: secondsLeft })}
          </Text>
        ) : null}
        {trigger.isPending ? <Text variant="heading">{t('sos.sending')}</Text> : null}
        {trigger.isError ? (
          <StatusBanner tone="notice" text={t('sos.failed', { number })} testID="sos-failed" />
        ) : null}
        {resolved ? (
          <StatusBanner tone="success" text={t('sos.resolved')} testID="sos-resolved" />
        ) : alert ? (
          <>
            <Text variant="heading">{t('sos.sent')}</Text>
            {alert.helpers.map((h) => (
              <StatusBanner
                key={h.id}
                tone={h.status === 'notified' ? 'info' : 'success'}
                text={helperLine(h)}
                testID={`sos-helper-${h.id}`}
              />
            ))}
          </>
        ) : null}
      </View>

      <ConfirmSheet
        visible={confirmingSafe}
        text={t('sos.safeConfirm')}
        onYes={() => {
          setConfirmingSafe(false);
          if (alertId) resolve.mutate(alertId);
        }}
        onNo={() => setConfirmingSafe(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: {
    gap: space.sm,
    marginTop: space.sm,
  },
});
