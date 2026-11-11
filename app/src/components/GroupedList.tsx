import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import {
  borderWidth,
  categoryColor,
  color,
  iconSize,
  radius,
  space,
  touch,
  type CategoryColorKey,
} from '@/theme';

import { CaretRightIcon, type Icon } from './primitives/icons';
import { Text } from './primitives/Text';

/**
 * An iOS-style grouped list (Luma settings): rows on one grey panel, with thin
 * lines between them, and an optional small heading above.
 */
export function GroupedList({
  title,
  children,
  testID,
}: {
  title?: string;
  children: ReactNode;
  testID?: string;
}) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.section} testID={testID}>
      {title ? (
        <Text variant="bodyStrong" color="textSecondary" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      <View style={styles.panel}>
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

export interface GroupedRowProps {
  title: string;
  subtitle?: string;
  /** A short value on the right ("English", "3 people"). */
  value?: string;
  icon?: Icon;
  /** The coloured rounded square behind the icon. */
  tint?: CategoryColorKey;
  /** Leave out for a row that only shows information (no chevron). */
  onPress?: () => void;
  testID?: string;
}

/** One row: a coloured icon square, title, grey subtitle, value and a chevron. */
export function GroupedRow({
  title,
  subtitle,
  value,
  icon: IconComponent,
  tint = 'other',
  onPress,
  testID,
}: GroupedRowProps) {
  const content = (
    <>
      {IconComponent ? (
        <View style={[styles.iconTile, { backgroundColor: categoryColor[tint].fg }]}>
          <IconComponent size={iconSize.inline} color={color.textOnColor} weight="fill" />
        </View>
      ) : null}
      <View style={styles.words}>
        <Text>{title}</Text>
        {subtitle ? <Text color="textSecondary">{subtitle}</Text> : null}
      </View>
      {value ? (
        <Text color="textSecondary" style={styles.value}>
          {value}
        </Text>
      ) : null}
      {onPress ? (
        <CaretRightIcon size={iconSize.inline} color={color.textSecondary} weight="bold" />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.row} accessible testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join('. ')}
      testID={testID}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const ICON_TILE = 44;

const styles = StyleSheet.create({
  section: {
    gap: space.xs,
  },
  panel: {
    borderRadius: radius.card,
    backgroundColor: color.bgSubtle,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: touch.min,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
  },
  pressed: {
    backgroundColor: color.primarySubtle,
  },
  divider: {
    height: borderWidth.hairline,
    backgroundColor: color.border,
    // Starts after the icon, like iOS.
    marginLeft: space.sm + ICON_TILE + space.sm,
  },
  iconTile: {
    width: ICON_TILE,
    height: ICON_TILE,
    borderRadius: radius.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The title always keeps room (never squeezed to a letter per line); a long value wraps.
  words: {
    flex: 1,
    minWidth: '40%',
    gap: space.xxs,
  },
  value: {
    flexShrink: 1,
    maxWidth: '50%',
    textAlign: 'right',
  },
});
