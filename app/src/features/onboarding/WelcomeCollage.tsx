import { StyleSheet, View, type DimensionValue } from 'react-native';

import type { EventCategory } from '@/api/types';
import { CoverArt } from '@/components';
import { CATEGORY_ICON } from '@/features/events/categories';
import { borderWidth, color, radius, shadow } from '@/theme';

interface Tile {
  category: EventCategory;
  size: number;
  left: DimensionValue;
  top: number;
  turn: string;
}

/** Our own category art, scattered like Luma's welcome collage. */
const TILES: readonly Tile[] = [
  { category: 'walk', size: 104, left: '2%', top: 18, turn: '-8deg' },
  { category: 'cooking', size: 88, left: '30%', top: 0, turn: '6deg' },
  { category: 'music', size: 96, left: '58%', top: 24, turn: '-4deg' },
  { category: 'games', size: 80, left: '80%', top: 2, turn: '10deg' },
  { category: 'gardening', size: 92, left: '16%', top: 120, turn: '5deg' },
  { category: 'exercise', size: 100, left: '44%', top: 112, turn: '-7deg' },
  { category: 'kids', size: 84, left: '74%', top: 126, turn: '7deg' },
];

/**
 * The welcome screen's picture (Luma): happenings people can join, as tilted
 * tiles. Decorative and still: continuous drifting would break our motion rule
 * (150–200 ms fades only) and can unsettle people prone to motion sickness.
 */
export function WelcomeCollage() {
  return (
    <View
      style={styles.frame}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID="welcome-collage"
    >
      {TILES.map((tile) => (
        <View
          key={tile.category}
          style={[
            styles.tile,
            { left: tile.left, top: tile.top, transform: [{ rotate: tile.turn }] },
          ]}
        >
          <CoverArt
            photoUrl={null}
            icon={CATEGORY_ICON[tile.category]}
            tint={tile.category}
            size={tile.size}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 240,
    overflow: 'hidden',
  },
  tile: {
    ...shadow.floating,
    position: 'absolute',
    borderRadius: radius.tile + borderWidth.control * 2,
    borderWidth: borderWidth.control * 2,
    borderColor: color.bg,
    backgroundColor: color.bg,
  },
});
