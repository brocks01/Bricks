import type { ImageSourcePropType } from 'react-native';

// One photo per kind of market event, from the pictures that ship with the app (design assets, not data).
export const EVENT_PHOTO: Record<'market_day' | 'volunteer' | 'gig' | 'show' | 'activity', ImageSourcePropType> = {
  market_day: require('../../../assets/images/singapore-seniors.jpg'),
  volunteer: require('../../../assets/images/contributions.jpg'),
  gig: require('../../../assets/images/knowledge.jpg'),
  show: require('../../../assets/images/hobbies.jpg'),
  activity: require('../../../assets/images/activity.jpg'),
};
