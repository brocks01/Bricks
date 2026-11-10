import { StyleSheet, View, type ViewProps } from 'react-native';

import { borderWidth, color, radius, space } from '@/theme';

export interface CardProps extends ViewProps {
  /** `subtle` sits on white as a light-grey panel (voice notes, placeholders). */
  tone?: 'default' | 'subtle';
  /** False for cards with edge-to-edge photos; the content adds its own padding. */
  padded?: boolean;
}

/** The one card style: flat, 1px border, 16dp corners, no shadow (docs/02 §5.3). */
export function Card({ tone = 'default', padded = true, style, ...rest }: CardProps) {
  return (
    <View
      style={[styles.card, tone === 'subtle' && styles.subtle, padded && styles.padded, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    borderColor: color.border,
    backgroundColor: color.bg,
    overflow: 'hidden',
  },
  subtle: {
    backgroundColor: color.bgSubtle,
  },
  padded: {
    padding: space.md,
    gap: space.sm,
  },
});
