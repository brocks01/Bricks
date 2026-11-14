import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { color, mapHeight, radius, svgMap } from '@/theme';

import type { EventsMapProps } from './EventsMap';

const VIEW = svgMap.view;
const PAD = svgMap.padPins;

/**
 * Web build: react-native-maps has no web version, so the pins are drawn where
 * they are relative to each other (no map tiles). Phones use EventsMap.tsx.
 */
export function EventsMap({ pins, label, height = mapHeight.xl }: EventsMapProps) {
  const dots = useMemo(() => {
    if (pins.length === 0) return [];
    const lats = pins.map((p) => p.lat);
    const lngs = pins.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const minLng = Math.min(...lngs);
    const span = Math.max(Math.max(...lats) - minLat, Math.max(...lngs) - minLng, 1e-6);
    const scale = (VIEW - 2 * PAD) / span;
    return pins.map((p) => ({
      id: p.id,
      x: PAD + (p.lng - minLng) * scale,
      y: VIEW - PAD - (p.lat - minLat) * scale,
    }));
  }, [pins]);

  return (
    <View
      style={[styles.frame, { height }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW} ${VIEW}`}>
        {dots.map((d) => (
          <Circle key={d.id} cx={d.x} cy={d.y} r={26} fill={color.primary} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    borderRadius: radius.card,
    backgroundColor: color.primarySubtle,
  },
});
