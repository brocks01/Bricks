import { StyleSheet, View } from 'react-native';

import { CoverArt } from '@/components';
import { CATEGORY_ICON } from '@/features/events/categories';
import { borderWidth, color, radius, shadow, welcomeCollage } from '@/theme';
import { useCompact } from '@/theme/TypographyProvider';

/** Our own category art, scattered like Luma's welcome collage (positions in @/theme). */
const TILES = welcomeCollage.tiles;

/**
 * The welcome screen's picture (Luma): happenings people can join, as tilted
 * tiles. Decorative and still: continuous drifting would break our motion rule
 * (150–200 ms fades only) and can unsettle people prone to motion sickness.
 */
export function WelcomeCollage() {
  // Small and Normal text: the same picture at 70%, so the four languages fit below.
  const scale = useCompact() ? COMPACT_SCALE : 1;
  return (
    <View
      style={[styles.frame, { height: FRAME_HEIGHT * scale }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID="welcome-collage"
    >
      {TILES.map((tile) => (
        <View
          key={tile.category}
          style={[
            styles.tile,
            { left: tile.left, top: tile.top * scale, transform: [{ rotate: tile.turn }] },
          ]}
        >
          <CoverArt
            photoUrl={null}
            icon={CATEGORY_ICON[tile.category]}
            tint={tile.category}
            size={Math.round(tile.size * scale)}
          />
        </View>
      ))}
    </View>
  );
}

const FRAME_HEIGHT = welcomeCollage.height;
const COMPACT_SCALE = 0.7;

const styles = StyleSheet.create({
  frame: {
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
