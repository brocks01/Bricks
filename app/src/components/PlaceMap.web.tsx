import { StyleSheet, View } from 'react-native';

import { color, iconSize, radius } from '@/theme';

import type { PlaceMapProps } from './PlaceMap';
import { MapPinIcon } from './primitives/icons';

/** Web build: react-native-maps has no web version, so a pin on a grey panel. */
export function PlaceMap({ label, height = 180 }: PlaceMapProps) {
  return (
    <View
      style={[styles.frame, { height }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <MapPinIcon size={iconSize.hero * 1.5} color={color.text} weight="fill" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    borderRadius: radius.tile,
    backgroundColor: color.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
