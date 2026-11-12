import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useJoinOrg } from '@/api';
import { BigButton, CheckCircleIcon, EmptyState, Screen, SealCheckIcon, Text } from '@/components';
import { useOnboarding } from '@/state/onboarding';
import { color, iconSize, space } from '@/theme';

/**
 * An organisation's QR (S11), scanned with the phone camera: `…/join/BISHAN`. They're
 * in straight away; then Home (or setting up, if this phone hasn't been set up yet).
 */
export default function JoinScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const join = useJoinOrg();
  const completed = useOnboarding((s) => s.completed);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !code) return;
    started.current = true;
    join.mutate(code);
    // Once per scan; Try again is the button below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const next = () => router.replace(completed ? '/home' : '/onboarding');

  return (
    <Screen
      readOut={() => (join.data ? t('join.joined', { name: join.data.name }) : t('join.joining'))}
      readOnOpen={!!join.data}
      testID="screen-join"
      footer={
        join.data ? (
          <BigButton label={t('join.goHome')} onPress={next} testID="join-done" />
        ) : undefined
      }
    >
      {join.data ? (
        <View style={styles.center}>
          <CheckCircleIcon size={iconSize.celebrate} color={color.success} weight="fill" />
          <Text variant="title" align="center" testID="join-joined">
            {t('join.joined', { name: join.data.name })}
          </Text>
          {join.data.verified ? (
            <View style={styles.verified}>
              <SealCheckIcon size={iconSize.inline} color={color.primary} weight="fill" />
              <Text>{t('join.verifiedLine')}</Text>
            </View>
          ) : null}
        </View>
      ) : join.isError ? (
        <EmptyState
          text={t('join.failed')}
          actionLabel={t('join.goHome')}
          onAction={next}
          testID="join-failed"
        />
      ) : (
        <View style={styles.center} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={color.primary} />
          <Text color="textSecondary">{t('join.joining')}</Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xl,
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
});
