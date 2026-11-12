import { StyleSheet, View, type ViewProps } from 'react-native';

import { color, radius, space, surface } from '@/theme';
import { useCompact } from '@/theme/TypographyProvider';

export interface CardProps extends ViewProps {
  /** Raised white card (default; `subtle` is the same), or `plain`: flat white, for cards inside cards. */
  tone?: 'default' | 'subtle' | 'plain';
  /** False for cards with edge-to-edge photos; the content adds its own padding. */
  padded?: boolean;
}

/**
 * The one card style: a white card with 20dp corners, a thin olive edge and a soft
 * shadow to lift it off the page. Unpadded cards clip their photo to the corners.
 */
export function Card({ tone = 'default', padded = true, style, ...rest }: CardProps) {
  const compact = useCompact();
  return (
    <View
      style={[
        styles.card,
        tone === 'plain' ? null : styles.raised,
        padded ? styles.padded : styles.clip,
        padded && compact && styles.paddedCompact,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    backgroundColor: color.bg,
  },
  // iOS draws no shadow outside a clipped view, so only photo cards clip.
  raised: {
    ...surface,
  },
  clip: {
    overflow: 'hidden',
  },
  padded: {
    padding: space.md - surface.borderWidth,
    gap: space.sm,
  },
  // Small and Normal text: a tighter card.
  paddedCompact: {
    padding: space.sm - surface.borderWidth,
    gap: space.xs + space.xxs,
  },
});
