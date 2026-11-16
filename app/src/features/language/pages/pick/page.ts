import { LANGUAGES } from '../../../../i18n/languages';
import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const languagePick = definePage({
  key: 'language.pick',
  module: 'language',
  route: '/settings/language',
  summary: 'The list of languages to choose from. Choosing one changes the whole app at once.',
  keywords: ['language', 'translate', 'choose'],
  elements: {
    heading: { kind: 'text' },
    language: { kind: 'choice', type: 'string', required: true, options: LANGUAGES.map((l) => l.code), summary: 'The app language: en, hi, bn, ta, zh or ms.' },
    done: { kind: 'action', summary: 'Save the language choice and go back.' },
  },
  strings,
});
