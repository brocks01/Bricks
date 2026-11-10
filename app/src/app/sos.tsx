import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { BigButton, PhoneIcon, Screen, Text } from '@/components';
import { config } from '@/lib/config';
import { warningFeedback } from '@/lib/haptics';
import { platform } from '@/lib/platform';
import { space } from '@/theme';

/**
 * S28 SOS, minimal and safe from day one: calling the emergency number always
 * works. Iteration 1.2 adds the Safe Circle countdown and Cancel; 2.2 adds the
 * real fan-out and live helper status.
 */
export default function SosScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const number = config.emergencyNumber;
  const [callFailed, setCallFailed] = useState(false);

  useEffect(() => {
    warningFeedback();
  }, []);

  const call = async () => {
    try {
      await Linking.openURL(`tel:${number}`);
    } catch {
      // No dialler (tablet, simulator): show the number in large text instead.
      setCallFailed(true);
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <Screen
      title={t('sos.title')}
      readOut={() => t('sos.readout', { number })}
      back={false}
      showHelp={false}
      standalone
      testID="screen-sos"
    >
      <View style={styles.actions}>
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
        <Text color="textSecondary">{t('sos.safeCircleSoon')}</Text>
        <BigButton
          variant="outline"
          size="lg"
          label={t('sos.goBack')}
          onPress={goBack}
          testID="sos-back"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: space.lg,
    marginTop: space.sm,
  },
});
