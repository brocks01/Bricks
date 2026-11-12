import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import {
  BigButton,
  CalendarCheckIcon,
  GearSixIcon,
  MicrophoneIcon,
  Screen,
  Text,
  WarningIcon,
  type Icon,
} from '@/components';
import { tapFeedback } from '@/lib/haptics';
import { useBuddy } from '@/state/buddy';
import { color, iconSize, radius, shadow, space, type ColorToken } from '@/theme';

import { useGreeting } from './useHomeReadout';

/** Each of the three buttons takes about a quarter of the screen (docs/02b S13). */
const BUTTON_SHARE = 0.2;
const MIN_BUTTON = 112;

/**
 * S13 Simple Mode (Be My Eyes + Grab): Home is three full-width buttons. Today reads
 * the day's plan and asks the check-in; Talk opens Buddy; Help is red and goes
 * straight to Help (S28). The screen reads itself out when it opens.
 */
export function SimpleHome() {
  const { t } = useTranslation();
  const router = useRouter();
  const openBuddy = useBuddy((s) => s.open);
  const greeting = useGreeting();
  const { height } = useWindowDimensions();
  const buttonHeight = Math.max(MIN_BUTTON, Math.round(height * BUTTON_SHARE));

  return (
    <Screen
      section="home"
      readOut={() => t('simple.readout', { greeting })}
      readOnOpen
      showHelp={false}
      tellMe={false}
      testID="screen-home-simple"
    >
      {/* The greeting with Settings beside it, as on the full Home. */}
      <View style={styles.header}>
        <Text variant="heading" style={styles.greeting}>
          {greeting}
        </Text>
        <BigButton
          variant="outline"
          fullWidth={false}
          icon={GearSixIcon}
          label={t('settings.title')}
          labelVariant="bodyStrong"
          onPress={() => router.push('/settings')}
          testID="home-settings"
        />
      </View>
      <View style={styles.buttons}>
        <SimpleButton
          icon={CalendarCheckIcon}
          label={t('simple.today')}
          hint={t('simple.todayHint')}
          bg="primary"
          height={buttonHeight}
          onPress={() => router.push('/today')}
          testID="simple-today"
        />
        <SimpleButton
          icon={MicrophoneIcon}
          label={t('simple.talk')}
          hint={t('simple.talkHint')}
          bg="bg"
          height={buttonHeight}
          onPress={openBuddy}
          testID="simple-talk"
        />
        <SimpleButton
          icon={WarningIcon}
          label={t('simple.help')}
          hint={t('simple.helpHint')}
          bg="sos"
          height={buttonHeight}
          onPress={() => router.push('/sos')}
          testID="simple-help"
        />
      </View>
    </Screen>
  );
}

function SimpleButton({
  icon: IconComponent,
  label,
  hint,
  bg,
  height,
  onPress,
  testID,
}: {
  icon: Icon;
  label: string;
  hint: string;
  bg: ColorToken;
  height: number;
  onPress: () => void;
  testID: string;
}) {
  const fg: ColorToken = bg === 'bg' ? 'text' : 'textOnColor';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { minHeight: height, backgroundColor: color[bg] },
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <IconComponent size={iconSize.hero} color={color[fg]} weight="bold" />
      <Text variant="title" color={fg} align="center">
        {label}
      </Text>
      <Text color={fg} align="center">
        {hint}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  greeting: {
    flex: 1,
    minWidth: '50%',
  },
  buttons: {
    gap: space.sm,
  },
  button: {
    ...shadow.card,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs,
    padding: space.md,
  },
  pressed: {
    opacity: 0.85,
  },
});
