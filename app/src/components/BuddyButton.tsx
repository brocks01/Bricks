import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { color, maxChromeFontScale, shadow, space, touch } from '@/theme';
import { useTouchSizes } from '@/theme/TypographyProvider';

import { MicrophoneIcon, StopIcon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface BuddyButtonProps {
  onPress: () => void;
  listening?: boolean;
  testID?: string;
}

/** Height of the button with Large text. */
export const BUDDY_BUTTON_SIZE = touch.min;
/** Room the button takes at the bottom of a screen, so the last item scrolls clear of it. */
export const BUDDY_BUTTON_CLEARANCE = BUDDY_BUTTON_SIZE + space.md;
/** The same with Small and Normal text, where the button is touch.compact. */
export const BUDDY_BUTTON_CLEARANCE_COMPACT = touch.compact + space.sm;

/**
 * Buddy, the voice agent: a black pill with a microphone and its name, floating in
 * the bottom-right corner of every screen (except the safety screens). Tap and say
 * what you want. Never icon-only. While listening it shows Stop and a soft pulsing
 * ring, so it's clear it's listening.
 */
export function BuddyButton({ onPress, listening = false, testID }: BuddyButtonProps) {
  const { t } = useTranslation();
  const [pulse] = useState(() => new Animated.Value(0));
  const IconComponent = listening ? StopIcon : MicrophoneIcon;
  const tap = useTouchSizes();
  const pill = { minHeight: tap.min, borderRadius: tap.min / 2 };

  useEffect(() => {
    if (!listening) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [listening, pulse]);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {listening ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.pulse,
            pill,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] }),
              transform: [
                { scaleX: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) },
                { scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) },
              ],
            },
          ]}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={listening ? t('common.stop') : t('buddy.buttonLabel')}
        accessibilityHint={listening ? undefined : t('tellMe.hint')}
        accessibilityState={{ busy: listening }}
        testID={testID}
        hitSlop={space.xs}
        onPress={() => {
          tapFeedback();
          onPress();
        }}
        style={({ pressed }) => [
          styles.button,
          pill,
          { backgroundColor: pressed || listening ? color.primaryPressed : color.primary },
        ]}
      >
        <IconComponent size={tap.icon} color={color.textOnColor} weight="fill" />
        <Text variant="bodyStrong" color="textOnColor" maxFontSizeMultiplier={maxChromeFontScale}>
          {listening ? t('common.stop') : t('buddy.name')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-end',
  },
  pulse: {
    backgroundColor: color.primary,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingLeft: space.sm,
    paddingRight: space.md,
    ...shadow.floating,
  },
});
