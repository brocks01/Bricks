import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { EmptyState, Screen, Text, showToast } from '@/components';
import { judgeNumber, useOpenAsJudge } from '@/features/settings/demoControls';
import { color, space } from '@/theme';

/**
 * Judge n's QR link (iteration 3.1): `bricks-preview://judge/3` on the APK, or the
 * Expo Go link with `--/judge/3`. Resets that judge, skips onboarding, opens Home.
 */
export default function JudgeLinkScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { n } = useLocalSearchParams<{ n: string }>();
  const number = judgeNumber(n);
  const open = useOpenAsJudge();
  const started = useRef(false);

  const start = (judge: number) =>
    open.mutate(judge, {
      onSuccess: (account) => {
        if (router.canDismiss()) router.dismissAll();
        router.replace('/home');
        showToast(t('judge.welcome', { name: account.name }));
      },
    });

  useEffect(() => {
    if (number === null || started.current) return;
    started.current = true;
    start(number);
    // Once per link: a retry is the button below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number]);

  if (number === null) return <Redirect href="/" />;

  return (
    <Screen back={false} showHelp={false} testID="screen-judge">
      {open.isError ? (
        <EmptyState
          text={t('judge.failed')}
          actionLabel={t('common.tryAgain')}
          onAction={() => start(number)}
          testID="judge-failed"
        />
      ) : (
        <View style={styles.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={color.primary} />
          <Text color="textSecondary" align="center">
            {t('judge.getting', { n: number })}
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xxl,
  },
});
