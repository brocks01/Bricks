import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { chart, color, space } from '@/theme';
import { useCompact } from '@/theme/TypographyProvider';

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

const CHART_HEIGHT = chart.height;
const CHART_HEIGHT_COMPACT = chart.heightCompact;
const STUB_HEIGHT = chart.stub;

function barHeight(bar: StatBar, max: number, full: number): number {
  if (!bar.done) return STUB_HEIGHT;
  if (bar.value === undefined || max <= 0) return full;
  return Math.max(STUB_HEIGHT * 2, Math.round((bar.value / max) * full));
}

/**
 * Apple-Health-style summary: one big number with a plain label, an optional
 * supporting line and a simple weekly bar chart. Screen readers hear one
 * sentence instead of every bar.
 */
export function StatCard({ label, value, unit, sub, bars, testID }: StatCardProps) {
  const { t } = useTranslation();
  const compact = useCompact();
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
      {compact ? null : (
        <Text variant="bodyStrong" color="textSecondary">
          {label}
        </Text>
      )}
      <View style={styles.valueRow}>
        <Text variant="stat">{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {/* Small and Normal text: "This week · 2 walks · 5 days in a row" on one line. */}
      {compact ? (
        <Text color="textSecondary">
          <Text variant="bodyStrong" color="textSecondary">
            {label}
          </Text>
          {sub ? ` · ${sub}` : null}
        </Text>
      ) : sub ? (
        <Text color="textSecondary">{sub}</Text>
      ) : null}

      {bars ? (
        <View style={styles.chart}>
          {bars.map((bar, index) => (
            <View key={`${bar.label}-${index}`} style={styles.column}>
              <View style={[styles.track, compact && styles.trackCompact]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight(bar, max, compact ? CHART_HEIGHT_COMPACT : CHART_HEIGHT),
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
    // Narrow gaps, so "Wed" fits under its bar on a small phone.
    gap: space.xxs,
    marginTop: space.xs,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: space.xxs,
  },
  // Small and Normal text: a shorter chart, so the page fits on one screen.
  trackCompact: {
    height: CHART_HEIGHT_COMPACT,
  },
  track: {
    height: CHART_HEIGHT,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    maxWidth: chart.maxBar,
  },
});
