import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle, Polyline } from 'react-native-maps';

import { regionFor, type LatLng } from '@/lib/geo';
import { platform } from '@/lib/platform';
import { borderWidth, color, radius } from '@/theme';

/**
 * A light Android map style: muted roads and labels so the walk route (in the
 * one accent colour) is what you see (docs/02 §5.4). iPhone uses Apple's own
 * "muted standard" style.
 */
const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ saturation: -80 }, { lightness: 20 }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export interface RouteMapProps {
  points: readonly LatLng[];
  /** Describes the map for screen readers ("Map of your walk around Bishan Park"). */
  label: string;
  height?: number;
  /** Live recording: keep the whole route in view as it grows. */
  live?: boolean;
  testID?: string;
}

const DOT_RADIUS_M = 12;

/**
 * The walk drawn as a thick blue line with a dot at the start (and at the end
 * when it's finished). The map is a picture, not a control: no panning,
 * pinching or rotating (no hidden gestures).
 */
export function RouteMap({ points, label, height = 240, live = false, testID }: RouteMapProps) {
  const region = useMemo(() => regionFor(points), [points]);
  const coordinates = useMemo(
    () => points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    [points],
  );
  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];

  return (
    <View
      style={[styles.frame, { height }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      importantForAccessibility="yes"
      testID={testID}
    >
      <MapView
        style={StyleSheet.absoluteFill}
        region={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsPointsOfInterests={false}
        liteMode={!live}
        mapType={platform.hasMutedMapStyle ? 'mutedStandard' : 'standard'}
        customMapStyle={platform.hasMutedMapStyle ? undefined : LIGHT_MAP_STYLE}
        importantForAccessibility="no-hide-descendants"
      >
        {coordinates.length > 1 ? (
          <Polyline
            coordinates={coordinates}
            strokeColor={color.primary}
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
        {start ? (
          <Circle
            center={start}
            radius={DOT_RADIUS_M}
            fillColor={color.primary}
            strokeColor={color.bg}
            strokeWidth={2}
          />
        ) : null}
        {end && !live && coordinates.length > 1 ? (
          <Circle
            center={end}
            radius={DOT_RADIUS_M}
            fillColor={color.success}
            strokeColor={color.bg}
            strokeWidth={2}
          />
        ) : null}
      </MapView>
    </View>
  );
}

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
