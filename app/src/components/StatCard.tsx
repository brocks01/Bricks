import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { color, space } from '@/theme';

import { Card } from './Card';
import { Text } from './primitives/Text';

export interface StatBar {
  /** Short day name under the bar ("Mon"). */
  label: string;
  /** Counts as an active day. Inactive days are neutral grey, never red. */
  done: boolean;
  /** Optional amount (e.g. km). Without values, active days show a full bar. */
  value?: number;
}

export interface StatCardProps {
  /** What the number is about: "This week". */
  label: string;
  /** The one big number: "8.6". */
  value: string;
  /** Plain unit after the number: "km walked". */
  unit?: string;
  /** One supporting line: "4 walks · 5-day streak". */
  sub?: string;
  /** Optional 7-day bar chart (Apple Health weekly bars). */
  bars?: StatBar[];
  testID?: string;
}

const CHART_HEIGHT = 72;
const STUB_HEIGHT = 8;

function barHeight(bar: StatBar, max: number): number {
  if (!bar.done) return STUB_HEIGHT;
  if (bar.value === undefined || max <= 0) return CHART_HEIGHT;
  return Math.max(STUB_HEIGHT * 2, Math.round((bar.value / max) * CHART_HEIGHT));
}

/**
 * Apple-Health-style summary: one big number with a plain label, an optional
 * supporting line and a simple weekly bar chart. Screen readers hear one
 * sentence instead of every bar.
 */
export function StatCard({ label, value, unit, sub, bars, testID }: StatCardProps) {
  const { t } = useTranslation();
  const max = Math.max(0, ...(bars ?? []).map((b) => b.value ?? 0));
  const activeDays = bars?.filter((b) => b.done).length ?? 0;
  const chartSummary = bars
    ? t('stat.daysActive', { done: activeDays, total: bars.length })
    : undefined;

  const spoken = [label, [value, unit].filter(Boolean).join(' '), sub, chartSummary]
    .filter(Boolean)
    .join('. ');

  return (
    <Card testID={testID} accessible accessibilityLabel={spoken}>
      <Text variant="bodyStrong" color="textSecondary">
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text variant="stat">{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {sub ? <Text color="textSecondary">{sub}</Text> : null}

      {bars ? (
        <View style={styles.chart}>
          {bars.map((bar, index) => (
            <View key={`${bar.label}-${index}`} style={styles.column}>
              <View style={styles.track}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight(bar, max),
                      backgroundColor: bar.done ? color.primary : color.neutral,
                    },
                  ]}
                />
              </View>
              <Text variant="caption" color="textSecondary" align="center" numberOfLines={1}>
                {bar.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: space.xs,
  },
  unit: {
    flexShrink: 1,
  },
  chart: {
    flexDirection: 'row',
    gap: space.xs,
    marginTop: space.xs,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: space.xxs,
  },
  track: {
    height: CHART_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    maxWidth: 32,
  },
});
