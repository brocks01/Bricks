import type { ImageSourcePropType } from 'react-native';

// A picture for every community: its own cover when it has one, otherwise one of the photos that ship with the app, chosen by what the group does.
const activity: ImageSourcePropType = require('../../../assets/images/activity.jpg');
const hobbies: ImageSourcePropType = require('../../../assets/images/hobbies.jpg');
const seniors: ImageSourcePropType = require('../../../assets/images/singapore-seniors.jpg');
const contributions: ImageSourcePropType = require('../../../assets/images/contributions.jpg');
const knowledge: ImageSourcePropType = require('../../../assets/images/knowledge.jpg');

const BY_WORD: [RegExp, ImageSourcePropType][] = [
  [/tai chi|walk|exercise|fitness|yoga|dance|sport|health/i, activity],
  [/music|jam|sing|choir|craft|rattan|art|heritage|culture/i, hobbies],
  [/garden|grow|green|plant/i, contributions],
  [/cook|food|hobby|club/i, hobbies],
  [/mentor|learn|skill|tech|digital|book/i, knowledge],
];

export function communityPhoto(c: { name: string; cover_url: string | null }, failed = false): ImageSourcePropType {
  if (c.cover_url && !failed) return { uri: c.cover_url };
  return BY_WORD.find(([re]) => re.test(c.name))?.[1] ?? seniors;
}
