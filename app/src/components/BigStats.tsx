import { StyleSheet, View } from 'react-native';

import { borderWidth, color, radius, space, surface } from '@/theme';
import { useEffectiveFontScale } from '@/theme/TypographyProvider';

import { Text } from './primitives/Text';

export interface BigStat {
  label: string;
  value: string;
}

/** Above this text size the stats stack instead of sitting side by side. */
const STACK_SCALE = 1.3;

/**
 * Three big numbers with plain labels underneath ("2.4 km / Distance"), on one white
 * card with thin lines between them. Side by side normally; stacked when text is
 * large so numbers never squeeze.
 */
export function BigStatsRow({ stats, testID }: { stats: BigStat[]; testID?: string }) {
  const stacked = useEffectiveFontScale() >= STACK_SCALE;
  return (
    <View style={[styles.row, stacked && styles.stacked]} testID={testID}>
      {stats.map((s, i) => (
        <View
          key={s.label}
          style={[
            styles.cell,
            i > 0 && (stacked ? styles.dividerTop : styles.dividerLeft),
            stacked && styles.cellStacked,
          ]}
          accessible
          accessibilityLabel={`${s.label}: ${s.value}`}
        >
          {/* Three side by side use the title size, so "3,000" fits its column without breaking. */}
          <Text
            variant={stacked || stats.length < 3 ? 'stat' : 'title'}
            align={stacked ? undefined : 'center'}
            style={styles.value}
          >
            {s.value}
          </Text>
          <Text color="textSecondary" align={stacked ? undefined : 'center'}>
            {s.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Live numbers while walking, one per line: label on the left, big number on the
 * right (Strava record screen, but only three numbers).
 */
export function BigStatsList({ stats, testID }: { stats: BigStat[]; testID?: string }) {
  return (
    <View style={styles.list} testID={testID}>
      {stats.map((s, i) => (
        <View
          key={s.label}
          style={[styles.line, i > 0 && styles.divider]}
          accessible
          accessibilityLabel={`${s.label}: ${s.value}`}
        >
          <Text variant="heading" color="textSecondary" style={styles.lineLabel}>
            {s.label}
          </Text>
          <Text variant="stat" style={styles.lineValue}>
            {s.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: radius.card,
    backgroundColor: color.bg,
    ...surface,
  },
  stacked: {
    flexDirection: 'column',
  },
  cell: {
    flex: 1,
    gap: space.xxs,
    paddingHorizontal: space.xxs,
    paddingVertical: space.sm,
  },
  dividerLeft: {
    borderLeftWidth: borderWidth.hairline,
    borderLeftColor: color.hairline,
  },
  dividerTop: {
    borderTopWidth: borderWidth.hairline,
    borderTopColor: color.hairline,
  },
  cellStacked: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: space.sm,
    paddingHorizontal: space.sm,
  },
  value: {
    fontVariant: ['tabular-nums'],
  },
  list: {
    gap: 0,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    columnGap: space.sm,
    paddingVertical: space.xs,
  },
  divider: {
    borderTopWidth: borderWidth.hairline,
    borderTopColor: color.border,
  },
  lineLabel: {
    flexShrink: 1,
  },
  lineValue: {
    fontVariant: ['tabular-nums'],
  },
});
