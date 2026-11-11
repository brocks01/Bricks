import { LANGUAGES } from '../../i18n';
import { chooseLanguage } from './choose';
import { isLangCode } from '../../i18n/languages';
import { defineModule } from '../../navigation/registry';
import { languagePick } from './pages/pick/page';

defineModule({
  id: 'language',
  title: 'Language',
  summary: 'Choose the language of the whole app. Everyone can change it any time.',
  keywords: ['language', 'translate', 'hindi', 'tamil', 'bengali', 'chinese', 'malay', 'english', 'change language'],
  pages: [languagePick],
  skills: [
    {
      name: 'list',
      summary: 'List the languages the app supports.',
      input: [],
      run: () => ({ ok: true, summary: LANGUAGES.map((l) => `${l.name} (${l.code})`).join(', '), data: LANGUAGES }),
    },
    {
      name: 'set',
      summary: 'Change the language of the whole app.',
      input: [{ name: 'code', type: 'string', required: true, enum: LANGUAGES.map((l) => l.code), description: 'Language code: en, hi, bn, ta, zh or ms.' }],
      keywords: ['switch', 'change', 'use'],
      run: async (input) => {
        if (!isLangCode(input.code)) return { ok: false, summary: `Unknown language "${String(input.code)}". Use one of: ${LANGUAGES.map((l) => l.code).join(', ')}.` };
        await chooseLanguage(input.code);
        const l = LANGUAGES.find((x) => x.code === input.code);
        return { ok: true, summary: `The app is now in ${l?.name}.` };
      },
    },
  ],
});
