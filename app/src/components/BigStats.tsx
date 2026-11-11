import { StyleSheet, View } from 'react-native';

import { borderWidth, color, radius, space } from '@/theme';
import { useEffectiveFontScale } from '@/theme/TypographyProvider';

import { Text } from './primitives/Text';

export interface BigStat {
  label: string;
  value: string;
}

/** Above this text size the stats stack instead of sitting side by side. */
const STACK_SCALE = 1.3;

/**
 * Three big numbers with plain labels underneath ("2.4 km / Distance").
 * Side by side normally; stacked when text is large so numbers never squeeze.
 */
export function BigStatsRow({ stats, testID }: { stats: BigStat[]; testID?: string }) {
  const stacked = useEffectiveFontScale() >= STACK_SCALE;
  return (
    <View style={[styles.row, stacked && styles.stacked]} testID={testID}>
      {stats.map((s) => (
        <View
          key={s.label}
          style={[styles.cell, stacked && styles.cellStacked]}
          accessible
          accessibilityLabel={`${s.label}: ${s.value}`}
        >
          <Text variant="stat" style={styles.value}>
            {s.value}
          </Text>
          <Text color="textSecondary">{s.label}</Text>
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
    gap: space.sm,
  },
  stacked: {
    flexDirection: 'column',
  },
  // Each number sits on its own grey panel (Luma / Apple Health).
  cell: {
    flex: 1,
    gap: space.xxs,
    padding: space.sm,
    borderRadius: radius.tile,
    backgroundColor: color.bgSubtle,
  },
  cellStacked: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: space.sm,
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
