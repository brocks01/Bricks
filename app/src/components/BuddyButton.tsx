import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { borderWidth, color, maxChromeFontScale, space, touch } from '@/theme';
import { useTouchSizes } from '@/theme/TypographyProvider';

import { MicrophoneIcon, StopIcon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface BuddyButtonProps {
  onPress: () => void;
  listening?: boolean;
  testID?: string;
}

/** Diameter of the round button. */
export const BUDDY_BUTTON_SIZE = touch.min;
/** Room the button (and its name) takes at the bottom of a screen. */
export const BUDDY_BUTTON_CLEARANCE = BUDDY_BUTTON_SIZE + space.xl + space.sm;
/**
 * The same with Small and Normal text, where the button is touch.compact: content
 * ends just above the round button (its name sits below it, beside the bottom edge).
 */
export const BUDDY_BUTTON_CLEARANCE_COMPACT = touch.compact + space.lg;

/**
 * Buddy, the voice agent: a round button floating in the bottom-right corner of
 * every screen (except the safety screens). Tap and say what you want.
 * Never icon-only: its name sits under it. While listening it shows Stop and a
 * soft pulsing ring, so it's clear it's listening.
 */
export function BuddyButton({ onPress, listening = false, testID }: BuddyButtonProps) {
  const { t } = useTranslation();
  const [pulse] = useState(() => new Animated.Value(0));
  const IconComponent = listening ? StopIcon : MicrophoneIcon;
  const tap = useTouchSizes();
  const round = { width: tap.min, height: tap.min, borderRadius: tap.min / 2 };

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
            styles.pulse,
            round,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) },
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
          round,
          { backgroundColor: pressed || listening ? color.primaryPressed : color.primary },
        ]}
      >
        <IconComponent size={tap.icon} color={color.textOnColor} weight="fill" />
      </Pressable>
      <View style={styles.name}>
        <Text
          variant="caption"
          weight="bold"
          color="primary"
          maxFontSizeMultiplier={maxChromeFontScale}
        >
          {listening ? t('common.stop') : t('buddy.name')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: space.xxs,
  },
  pulse: {
    position: 'absolute',
    top: 0,
    width: BUDDY_BUTTON_SIZE,
    height: BUDDY_BUTTON_SIZE,
    borderRadius: BUDDY_BUTTON_SIZE / 2,
    backgroundColor: color.primary,
  },
  button: {
    width: BUDDY_BUTTON_SIZE,
    height: BUDDY_BUTTON_SIZE,
    borderRadius: BUDDY_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // A white ring keeps it distinct from whatever scrolls underneath.
    borderWidth: borderWidth.control * 2,
    borderColor: color.bg,
    elevation: 6,
    shadowColor: color.scrim,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  name: {
    paddingHorizontal: space.xs,
    borderRadius: space.sm,
    backgroundColor: color.bg,
  },
});
