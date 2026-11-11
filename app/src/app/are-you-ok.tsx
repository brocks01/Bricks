import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useConfirmOk } from '@/api';
import { BigButton, Screen, StatusBanner, Text } from '@/components';
import { formatCount } from '@/lib/format';
import { warningFeedback } from '@/lib/haptics';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/** Seconds shown before "we'll phone you" (docs/02b S29). */
export const ARE_YOU_OK_COUNTDOWN_S = 30;

/**
 * S29 Are you OK? (Apple fall-detection prompt), opened by the missed-check-in
 * alert (escalation ladder, iteration 2.2).
 * - "Are you okay?" large, read aloud as it opens.
 * - I'm OK (green) stops the ladder; I need help (red) goes straight to S28.
 * - A 30 s countdown. The app never calls anyone by itself: at zero it says the
 *   next step honestly (we'll phone you), which the server ladder does.
 */
export default function AreYouOkScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const confirm = useConfirmOk();

  const [openedAt] = useState(() => Date.now());
  const [now, setNow] = useState(openedAt);
  const secondsLeft = Math.max(0, ARE_YOU_OK_COUNTDOWN_S - Math.floor((now - openedAt) / 1000));
  const answered = confirm.isSuccess;

  useEffect(() => warningFeedback(), []);

  useEffect(() => {
    if (secondsLeft === 0 || answered) return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [secondsLeft, answered]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <Screen
      title={t('safety.areYouOk.title')}
      readOut={() => (answered ? t('safety.areYouOk.thanks') : t('safety.areYouOk.readout'))}
      readOnOpen
      back={false}
      showHelp={false}
      standalone
      testID="screen-are-you-ok"
      footer={
        answered ? <BigButton label={t('common.done')} onPress={close} testID="ok-done" /> : null
      }
    >
      <Text variant="display">{t('safety.areYouOk.title')}</Text>
      <Text>{t('safety.areYouOk.why')}</Text>

      {answered ? (
        <StatusBanner tone="success" text={t('safety.areYouOk.thanks')} testID="ok-thanks" />
      ) : (
        <>
          <BigButton
            variant="success"
            size="xl"
            label={t('safety.areYouOk.ok')}
            onPress={() => confirm.mutate()}
            disabled={confirm.isPending}
            testID="ok-yes"
          />
          <BigButton
            variant="sos"
            size="xl"
            label={t('safety.areYouOk.help')}
            onPress={() => router.replace('/sos')}
            testID="ok-help"
          />
          {confirm.isError ? (
            <StatusBanner tone="notice" text={t('common.error')} testID="ok-failed" />
          ) : null}
          <View style={styles.countdown} accessibilityLiveRegion="polite">
            {secondsLeft > 0 ? (
              <>
                <Text variant="stat" align="center" testID="ok-countdown">
                  {formatCount(secondsLeft, language)}
                </Text>
                <Text align="center" color="textSecondary">
                  {t('safety.areYouOk.countdown')}
                </Text>
              </>
            ) : (
              <StatusBanner
                tone="notice"
                text={t('safety.areYouOk.noAnswer')}
                testID="ok-no-answer"
              />
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  countdown: {
    gap: space.xs,
    marginTop: space.sm,
  },
});
