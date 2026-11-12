import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { CheckCircleIcon, CircleIcon } from '@/components/primitives/icons';
import { Text } from '@/components/primitives/Text';
import { tapFeedback } from '@/lib/haptics';
import {
  borderWidth,
  color,
  iconSize,
  radius,
  shadow,
  space,
  TEXT_SIZES,
  textSizeScale,
  touch,
  type TextSize,
} from '@/theme';
import { TypographyProvider, useTypography } from '@/theme/TypographyProvider';

/**
 * Small · Normal · Large as three white cards, each written in its own size so the
 * member sees the difference before choosing. Choosing applies it to the whole app
 * at once. Selected has a black border and a filled tick (not colour alone).
 */
export function TextSizePicker({
  selected,
  onChoose,
}: {
  selected: TextSize;
  onChoose: (size: TextSize) => void;
}) {
  const { t } = useTranslation();
  const { language, fontsLoaded } = useTypography();

  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {TEXT_SIZES.map((size) => {
        const on = selected === size;
        const Mark = on ? CheckCircleIcon : CircleIcon;
        return (
          <Pressable
            key={size}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, checked: on }}
            accessibilityLabel={`${t(`textSize.${size}`)}. ${t(`textSize.${size}Hint`)}`}
            onPress={() => {
              tapFeedback();
              onChoose(size);
            }}
            style={({ pressed }) => [
              styles.option,
              on ? styles.selected : pressed ? styles.pressed : null,
            ]}
            testID={`text-size-${size}`}
          >
            <Mark size={iconSize.button} color={color.text} weight={on ? 'fill' : 'bold'} />
            {/* Each option previews its own size, whatever is chosen right now. */}
            <TypographyProvider
              language={language}
              fontsLoaded={fontsLoaded}
              fontScale={textSizeScale[size]}
            >
              <View style={styles.words}>
                <Text variant="heading">{t(`textSize.${size}`)}</Text>
                <Text color="textSecondary">{t(`textSize.${size}Hint`)}</Text>
              </View>
            </TypographyProvider>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: touch.min,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.card,
    borderWidth: borderWidth.control,
    borderColor: color.bg,
    backgroundColor: color.bg,
    ...shadow.card,
  },
  selected: {
    borderColor: color.text,
  },
  pressed: {
    borderColor: color.primarySubtle,
    backgroundColor: color.primarySubtle,
  },
  words: {
    flex: 1,
    gap: space.xxs,
  },
});
