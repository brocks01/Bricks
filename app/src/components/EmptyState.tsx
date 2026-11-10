import { StyleSheet, View } from 'react-native';

import { color, iconSize, radius, space } from '@/theme';

import { BigButton } from './BigButton';
import type { Icon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface EmptyStateProps {
  /** One friendly sentence that says what to do: "No events near you yet. Start one?" */
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: Icon;
  testID?: string;
}

/** Never a blank screen (Monzo): one sentence and one action. */
export function EmptyState({
  text,
  actionLabel,
  onAction,
  icon: IconComponent,
  testID,
}: EmptyStateProps) {
  return (
    <View style={styles.box} testID={testID}>
      {IconComponent ? (
        <View style={styles.iconWell}>
          <IconComponent size={iconSize.hero} color={color.primary} weight="regular" />
        </View>
      ) : null}
      <Text align="center">{text}</Text>
      {actionLabel && onAction ? (
        <BigButton label={actionLabel} onPress={onAction} testID={testID && `${testID}-action`} />
      ) : null}
    </View>
  );
}

const ICON_WELL = 80;

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xl,
  },
  iconWell: {
    width: ICON_WELL,
    height: ICON_WELL,
    borderRadius: radius.avatar,
    backgroundColor: color.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
