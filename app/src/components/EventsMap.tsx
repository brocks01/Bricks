import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { regionFor } from '@/lib/geo';
import { color, mapHeight, radius } from '@/theme';

export interface EventsMapPin {
  id: string;
  title: string;
  /** "Tomorrow, 7 am", shown when the pin is tapped. */
  when: string;
  lat: number;
  lng: number;
}

export interface EventsMapProps {
  pins: EventsMapPin[];
  onOpen: (id: string) => void;
  /** Describes the map for screen readers; the same events are listed below it. */
  label: string;
  height?: number;
}

/**
 * Happenings on a map (Luma's map view): one pin per event; tapping a pin shows its
 * name and time, and tapping that opens the event. The list below the map has the
 * same events as big buttons, so the map is never the only way in.
 */
export function EventsMap({ pins, onOpen, label, height = mapHeight.xl }: EventsMapProps) {
  const region = useMemo(() => regionFor(pins, 1.6), [pins]);
  return (
    <View
      style={[styles.frame, { height }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        importantForAccessibility="no-hide-descendants"
      >
        {pins.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.title}
            description={p.when}
            pinColor={color.primary}
            onCalloutPress={() => onOpen(p.id)}
            testID={`map-pin-${p.id}`}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.card,
    backgroundColor: color.bgSubtle,
  },
});
