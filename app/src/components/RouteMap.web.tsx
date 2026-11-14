import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import type { LatLng } from '@/lib/geo';
import { borderWidth, color, mapHeight, radius, svgMap } from '@/theme';

import type { RouteMapProps } from './RouteMap';
import { useCompact } from '@/theme/TypographyProvider';

const VIEW = svgMap.view;
const PAD = svgMap.pad;

/**
 * Web build: react-native-maps has no web version, so the route is drawn on
 * its own (same line, start and end dots, no map tiles). Phones use RouteMap.tsx.
 */
export function RouteMap({
  points,
  label,
  height = mapHeight.lg,
  live = false,
  testID,
}: RouteMapProps) {
  // Small and Normal text: a shorter map so the numbers and buttons fit below it.
  const shownHeight = Math.round(height * (useCompact() ? COMPACT_MAP_SCALE : 1));
  const path = useMemo(() => project(points), [points]);
  const start = path[0];
  const end = path[path.length - 1];

  return (
    <View
      style={[styles.frame, { height: shownHeight }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      testID={testID}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW} ${VIEW}`}>
        {path.length > 1 ? (
          <Polyline
            points={path.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={color.primary}
            strokeWidth={svgMap.route}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {start ? <Circle cx={start.x} cy={start.y} r={20} fill={color.primary} /> : null}
        {end && !live && path.length > 1 ? (
          <Circle cx={end.x} cy={end.y} r={20} fill={color.success} />
        ) : null}
      </Svg>
    </View>
  );
}

/** Lat/lng to a square drawing, north up, keeping the route's shape. */
function project(points: readonly LatLng[]): { x: number; y: number }[] {
  if (points.length === 0) return [];
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const lngScale = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const span = Math.max(maxLat - minLat, (maxLng - minLng) * lngScale, 1e-6);
  const scale = (VIEW - 2 * PAD) / span;
  return points.map((p) => ({
    x: PAD + (p.lng - minLng) * lngScale * scale,
    y: VIEW - PAD - (p.lat - minLat) * scale,
  }));
}

const COMPACT_MAP_SCALE = 0.6;

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    borderColor: color.border,
    backgroundColor: color.bgSubtle,
  },
});
