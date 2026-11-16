import { definePage } from '../../../../kit/page';
import { languageStrings } from '../../preWords';

export const authLanguage = definePage({
  key: 'auth.language',
  module: 'auth',
  route: '/choose-language',
  bare: true,
  summary: 'Choose the language: English, Chinese, Malay, Tamil or a dialect. The app changes the moment one is tapped.',
  keywords: ['language', 'choose language', 'english', 'chinese', 'malay', 'tamil'],
  elements: {
    heading: { kind: 'text' },
    next: { kind: 'action', summary: 'Goes on to Singpass.' },
  },
  strings: languageStrings,
});
