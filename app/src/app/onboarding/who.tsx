import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BuildingsIcon, Screen, SectionCard, UserIcon, UsersThreeIcon } from '@/components';
import { useResumeHere } from '@/features/onboarding/useResumeHere';
import { useOnboarding, type OnboardingPath } from '@/state/onboarding';
import { space } from '@/theme';

/**
 * S2 Who is setting up? (Airbnb choice cards): Myself · My family · My community
 * or centre. The community path comes later (3.2), so its card says so instead
 * of leading nowhere.
 */
export default function WhoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setPath = useOnboarding((s) => s.setPath);
  useResumeHere('/onboarding/who');

  const choose = (path: OnboardingPath) => {
    setPath(path);
    router.push('/onboarding/sign-in');
  };

  return (
    <Screen
      title={t('onboarding.who.title')}
      readOut={() => t('onboarding.who.readout')}
      tellMe={false}
      testID="screen-onboarding-who"
    >
      <View style={styles.cards}>
        <SectionCard
          icon={UserIcon}
          title={t('onboarding.who.self')}
          description={t('onboarding.who.selfHint')}
          onPress={() => choose('self')}
          testID="who-self"
        />
        <SectionCard
          icon={UsersThreeIcon}
          title={t('onboarding.who.family')}
          description={t('onboarding.who.familyHint')}
          onPress={() => choose('family')}
          testID="who-family"
        />
        <SectionCard
          icon={BuildingsIcon}
          title={t('onboarding.who.community')}
          description={t('onboarding.who.communityHint')}
          note={t('common.comingSoon')}
          disabled
          onPress={() => {}}
          testID="who-community"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards: {
    gap: space.sm,
  },
});
