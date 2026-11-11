import { StyleSheet, View, type ViewProps } from 'react-native';

import { color, radius, space } from '@/theme';

export interface CardProps extends ViewProps {
  /** Grey panel (default; `subtle` is the same), or `plain` white for cards on a grey panel. */
  tone?: 'default' | 'subtle' | 'plain';
  /** False for cards with edge-to-edge photos; the content adds its own padding. */
  padded?: boolean;
}

/** The one card style (Luma): a borderless soft-grey panel with 20dp corners, no shadow. */
export function Card({ tone = 'default', padded = true, style, ...rest }: CardProps) {
  return (
    <View
      style={[styles.card, tone === 'plain' && styles.plain, padded && styles.padded, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    backgroundColor: color.bgSubtle,
    overflow: 'hidden',
  },
  plain: {
    backgroundColor: color.bg,
  },
  padded: {
    padding: space.md,
    gap: space.sm,
  },
});
