import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { tapFeedback } from '@/lib/haptics';
import { useCompact } from '@/theme/TypographyProvider';
import {
  borderWidth,
  categoryColor,
  color,
  iconSize,
  radius,
  space,
  surface,
  touch,
  type CategoryColorKey,
} from '@/theme';

import { CaretRightIcon, type Icon } from './primitives/icons';
import { Text } from './primitives/Text';

/**
 * An iOS-style grouped list (Luma settings): rows on one white panel, with thin
 * lines between them, and an optional small heading above.
 */
export function GroupedList({
  title,
  inset = true,
  children,
  testID,
}: {
  title?: string;
  /** Lines start after the icon (iOS). False for tall rows with buttons: edge to edge. */
  inset?: boolean;
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
        <View style={styles.clip}>
          {rows.map((row, i) => (
            <Fragment key={row.key ?? i}>
              {i > 0 ? <View style={[styles.divider, !inset && styles.dividerFull]} /> : null}
              {row}
            </Fragment>
          ))}
        </View>
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
  /** Something else in the icon's place (a walk's route thumbnail). */
  leading?: ReactNode;
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
  leading,
  onPress,
  testID,
}: GroupedRowProps) {
  const compact = useCompact();
  const content = (
    <>
      {leading ?? null}
      {!leading && IconComponent ? (
        <View
          style={[
            styles.iconTile,
            compact && styles.iconTileCompact,
            { backgroundColor: categoryColor[tint].fg },
          ]}
        >
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
        <CaretRightIcon
          size={iconSize.inline}
          color={color.textSecondary}
          weight="bold"
          style={styles.caret}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.row, compact && styles.rowCompact]} accessible testID={testID}>
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
      style={({ pressed }) => [styles.row, compact && styles.rowCompact, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const ICON_TILE = 44;
const ICON_TILE_COMPACT = 36;

const styles = StyleSheet.create({
  section: {
    gap: space.xs,
  },
  panel: {
    ...surface,
    borderRadius: radius.card,
    backgroundColor: color.bg,
  },
  clip: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: touch.min,
    paddingHorizontal: space.sm - surface.borderWidth,
    paddingVertical: space.sm,
  },
  rowCompact: {
    minHeight: touch.compact,
    paddingVertical: space.xs,
    gap: space.xs + space.xxs,
  },
  iconTileCompact: {
    width: ICON_TILE_COMPACT,
    height: ICON_TILE_COMPACT,
  },
  pressed: {
    backgroundColor: color.primarySubtle,
  },
  divider: {
    height: borderWidth.hairline,
    backgroundColor: color.hairline,
    // Starts after the icon, like iOS.
    marginLeft: space.sm + ICON_TILE + space.sm,
  },
  dividerFull: {
    marginLeft: 0,
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
    minWidth: '30%',
    gap: space.xxs,
  },
  // The chevron never squeezes, whatever the words beside it.
  caret: {
    flexShrink: 0,
  },
  value: {
    flexShrink: 1,
    maxWidth: '50%',
    textAlign: 'right',
  },
});
