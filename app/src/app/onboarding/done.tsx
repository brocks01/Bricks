import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useMe } from '@/api';
import { BigButton, CheckCircleIcon, HouseIcon, Screen, Text } from '@/components';
import { useOnboarding } from '@/state/onboarding';
import { color, iconSize, space } from '@/theme';

/**
 * S8 All set (Monzo calm success): a check, one warm sentence about what happens
 * next, and one button. No confetti.
 */
export default function AllSetScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const complete = useOnboarding((s) => s.complete);
  const { data: me } = useMe();
  const name = me?.preferred_name ?? me?.name;
  const welcome = name
    ? t('onboarding.done.welcome', { name })
    : t('onboarding.done.welcomeNoName');

  return (
    <Screen
      readOut={() => `${welcome} ${t('onboarding.done.next')}`}
      back={false}
      tellMe={false}
      testID="screen-onboarding-done"
      footer={
        <BigButton
          size="lg"
          icon={HouseIcon}
          label={t('onboarding.done.goHome')}
          onPress={() => {
            complete();
            // Back to the Home that sits under onboarding, so Back never returns to set-up.
            router.dismissTo('/home');
          }}
          testID="done-go-home"
        />
      }
    >
      <View style={styles.body}>
        <CheckCircleIcon size={iconSize.celebrate} color={color.success} weight="fill" />
        <Text variant="display" align="center">
          {welcome}
        </Text>
        <Text variant="heading" weight="regular" align="center">
          {t('onboarding.done.next')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    gap: space.md,
    marginTop: space.xxl,
  },
});
