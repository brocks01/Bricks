import { StyleSheet, View } from 'react-native';

import { color, iconSize, radius, space } from '@/theme';

import { BigButton } from './BigButton';
import type { Icon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface EmptyStateProps {
  /** One friendly sentence that says what to do: "No events near you yet. Start one?" */
  text: string;
  /** One grey line under it, when it helps. */
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: Icon;
  testID?: string;
}

/**
 * Never a blank screen (Luma / Monzo): a soft grey icon, one bold line, an optional
 * grey line and one action.
 */
export function EmptyState({
  text,
  detail,
  actionLabel,
  onAction,
  icon: IconComponent,
  testID,
}: EmptyStateProps) {
  return (
    <View style={styles.box} testID={testID}>
      {IconComponent ? (
        <View style={styles.iconWell}>
          <IconComponent size={iconSize.hero} color={color.textSecondary} weight="regular" />
        </View>
      ) : null}
      <Text variant="bodyStrong" align="center">
        {text}
      </Text>
      {detail ? (
        <Text align="center" color="textSecondary">
          {detail}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <BigButton label={actionLabel} onPress={onAction} testID={testID && `${testID}-action`} />
        </View>
      ) : null}
    </View>
  );
}

const ICON_WELL = 80;

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.xl,
  },
  action: {
    alignSelf: 'stretch',
    marginTop: space.sm,
  },
  iconWell: {
    width: ICON_WELL,
    height: ICON_WELL,
    borderRadius: radius.avatar,
    backgroundColor: color.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
