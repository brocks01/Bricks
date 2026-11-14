import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { color, mapHeight, radius } from '@/theme';

/** Shows a few streets around the place: close enough to recognise it. */
const SPAN = 0.006;

export interface PlaceMapProps {
  lat: number;
  lng: number;
  /** Describes the map for screen readers ("Map of Bishan Park, Gate 2"). */
  label: string;
  height?: number;
}

/**
 * A small map preview with one pin (Luma's location card). A picture, not a
 * control: no panning or zooming; "Open in Maps" next to it does the rest.
 */
export function PlaceMap({ lat, lng, label, height = mapHeight.xs }: PlaceMapProps) {
  return (
    <View
      style={[styles.frame, { height }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      importantForAccessibility="yes"
    >
      <MapView
        style={StyleSheet.absoluteFill}
        region={{ latitude: lat, longitude: lng, latitudeDelta: SPAN, longitudeDelta: SPAN }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        liteMode
        importantForAccessibility="no-hide-descendants"
      >
        <Marker coordinate={{ latitude: lat, longitude: lng }} pinColor={color.primary} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.tile,
    backgroundColor: color.bgSubtle,
  },
});
