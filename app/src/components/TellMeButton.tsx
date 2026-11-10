import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { borderWidth, color, iconSize, maxChromeFontScale, radius, space, touch } from '@/theme';

import { MicrophoneIcon, StopIcon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface TellMeButtonProps {
  onPress: () => void;
  listening?: boolean;
  testID?: string;
}

/**
 * The voice helper's button: always bottom-centre, 72dp, mic + "Tell me"
 * (Be My Eyes). While listening it turns into "Stop". A white ring keeps it
 * distinct from content underneath without a shadow.
 */
export function TellMeButton({ onPress, listening = false, testID }: TellMeButtonProps) {
  const { t } = useTranslation();
  const label = listening ? t('common.stop') : t('common.tellMe');
  const IconComponent = listening ? StopIcon : MicrophoneIcon;

  return (
    <View style={styles.ring}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={listening ? undefined : t('tellMe.hint')}
        accessibilityState={{ busy: listening }}
        testID={testID}
        onPress={() => {
          tapFeedback();
          onPress();
        }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: pressed || listening ? color.primaryPressed : color.primary },
        ]}
      >
        <IconComponent size={iconSize.button} color={color.textOnColor} weight="bold" />
        <Text variant="button" color="textOnColor" maxFontSizeMultiplier={maxChromeFontScale}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignSelf: 'center',
    padding: borderWidth.control * 2,
    borderRadius: radius.button + borderWidth.control * 2,
    backgroundColor: color.bg,
  },
  button: {
    minHeight: touch.large,
    minWidth: touch.large * 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.lg,
    borderRadius: radius.button,
  },
});
