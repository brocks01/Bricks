import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { decodePath } from '@/lib/geo';
import { categoryColor, thumbSize, layout, radius, stroke } from '@/theme';

export interface RouteThumbProps {
  /** Encoded route: the public one (home left out), so it's safe to show anywhere. */
  polyline: string;
  size?: number;
}

const PADDING = layout.thumbInset;
const STROKE = stroke.thumb;

/**
 * A walk's shape as a small line drawing on the walk colour (Strava's activity
 * thumbnails), no map tiles. Decoration only: the row beside it says what it is.
 */
export function RouteThumb({ polyline, size = thumbSize.md }: RouteThumbProps) {
  const points = useMemo(() => {
    const path = decodePath(polyline);
    if (path.length < 2) return '';
    const lats = path.map((p) => p.lat);
    const lngs = path.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    // Longitude degrees are shorter away from the equator.
    const lngScale = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
    const width = (maxLng - minLng) * lngScale || 1e-9;
    const height = maxLat - minLat || 1e-9;
    const inner = size - PADDING * 2;
    const scale = inner / Math.max(width, height);
    const offsetX = PADDING + (inner - width * scale) / 2;
    const offsetY = PADDING + (inner - height * scale) / 2;
    return path
      .map((p) => {
        const x = offsetX + (p.lng - minLng) * lngScale * scale;
        const y = offsetY + (maxLat - p.lat) * scale;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [polyline, size]);

  return (
    <View
      style={[styles.tile, { width: size, height: size }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {points ? (
        <Svg width={size} height={size}>
          <Polyline
            points={points}
            fill="none"
            stroke={categoryColor.walk.fg}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.tile,
    backgroundColor: categoryColor.walk.bg,
    overflow: 'hidden',
  },
});
