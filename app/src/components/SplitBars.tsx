import { StyleSheet, View } from 'react-native';

import { chart, color, columnWidth, space } from '@/theme';

import { Text } from './primitives/Text';

export interface Split {
  /** "1 km", or "400 m" for the last part. */
  label: string;
  /** "13:05" (minutes:seconds for that km). */
  time: string;
  /** For the bar length: seconds per km. */
  pace_s: number;
  /** Spoken: "1 km in 13 minutes 5 seconds". */
  spoken: string;
}

const BAR_HEIGHT = chart.splitBar;

/**
 * "Each kilometre": one row per km with a simple bar and the time. All bars the
 * same colour: no red/green "good" or "bad" (docs/02b S23).
 */
export function SplitBars({ splits, testID }: { splits: Split[]; testID?: string }) {
  const slowest = Math.max(1, ...splits.map((s) => s.pace_s));
  return (
    <View style={styles.list} testID={testID}>
      {splits.map((s) => (
        <View key={s.label} style={styles.row} accessible accessibilityLabel={s.spoken}>
          <Text variant="bodyStrong" style={styles.label}>
            {s.label}
          </Text>
          <View style={styles.track}>
            <View style={[styles.bar, { width: `${Math.max(12, (s.pace_s / slowest) * 100)}%` }]} />
          </View>
          <Text style={styles.time}>{s.time}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  label: {
    minWidth: columnWidth.label,
  },
  track: {
    flex: 1,
    height: BAR_HEIGHT,
    justifyContent: 'center',
  },
  bar: {
    height: BAR_HEIGHT,
    backgroundColor: color.primary,
  },
  time: {
    minWidth: columnWidth.timeWide,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
