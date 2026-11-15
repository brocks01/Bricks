import type { ImageSourcePropType } from 'react-native';
import type { ExploreCategoryId } from '../../api/explore';

// The pictures that ship with the app (app/assets/images): one banner per Grow or Explore screen, one per category. They are design assets, not data.
export const growHero: ImageSourcePropType = require('../../../assets/images/grow-hero.jpg');
export const exploreHero: ImageSourcePropType = require('../../../assets/images/explore-hero.jpg');
export const categoryPic: Record<ExploreCategoryId, ImageSourcePropType> = {
  digital_skills: require('../../../assets/images/digital-skills.jpg'),
  health_awareness: require('../../../assets/images/health-awareness.jpg'),
  everyday_life: require('../../../assets/images/everyday-life.jpg'),
  hobbies: require('../../../assets/images/hobbies.jpg'),
  culture: require('../../../assets/images/culture.jpg'),
  knowledge: require('../../../assets/images/knowledge.jpg'),
};

// Each category's small symbol and its soft colour, as in the sample (green, red, green, orange, green, orange).
export const categoryLook: Record<ExploreCategoryId, { icon: string; lib: 'ion' | 'mci'; color: string; tint: string }> = {
  digital_skills: { icon: 'laptop-outline', lib: 'ion', color: '#B0502A', tint: '#E3F1E7' },
  health_awareness: { icon: 'heart-outline', lib: 'ion', color: '#E5372E', tint: '#FDE8E7' },
  everyday_life: { icon: 'compass-outline', lib: 'ion', color: '#B0502A', tint: '#E3F1E7' },
  hobbies: { icon: 'palette-outline', lib: 'mci', color: '#E58A1F', tint: '#FDF0DC' },
  culture: { icon: 'bank-outline', lib: 'mci', color: '#B0502A', tint: '#E3F1E7' },
  knowledge: { icon: 'lightbulb-on-outline', lib: 'mci', color: '#E58A1F', tint: '#FDF0DC' },
};
