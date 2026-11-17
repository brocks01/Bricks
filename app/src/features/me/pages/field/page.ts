import { definePage } from '../../../../kit/page';
import { pageWords } from '../../../../i18n/words';
import { ONBOARDING } from '../../../onboarding/words';
import { REF } from '../../../onboarding/referenceWords';
import { WIZARD } from '../../../onboarding/wizardWords';
import { PF } from '../../detailWords';

/** The kinds of detail the profile can change, one edit screen each. */
export const FIELDS = ['language', 'textSize', 'name', 'area', 'enjoy', 'voice', 'reminders', 'age', 'phone'] as const;
export type FieldId = (typeof FIELDS)[number];

// One edit screen per detail on the profile, each drawn with the same body as its onboarding step. Save saves it, says "Saved" and goes back.
export const meField = definePage({
  key: 'me.field',
  module: 'me',
  route: '/profile/[field]',
  params: ['field'],
  requiresAuth: true,
  summary: 'Change one of your details: field is language, textSize, name, area, enjoy (what you enjoy), voice, reminders, age or phone. Each looks like its onboarding step; Save saves it and goes back to the profile.',
  keywords: ['edit', 'change', 'profile', 'name', 'area', 'where I live', 'interests', 'enjoy', 'text size', 'language', 'reminders', 'voice', 'phone', 'age'],
  elements: {
    heading: { kind: 'text', summary: 'Which detail this screen changes.' },
    answer: { kind: 'field', type: 'string', summary: 'The new value. name, area, phone: the words. language: a code (en, hi, bn, ta, zh, ms). textSize: small, normal or large. enjoy: a comma list of walking, taichi, cooking, chess, music, gardening, teaching, tech. reminders: app or call. age: under40, 40to59 or 60plus. voice cannot be filled (only the person can record).' },
    record: { kind: 'action', summary: 'On the voice screen: start or stop recording.' },
    save: { kind: 'action', summary: 'Saves the change and goes back to the profile.' },
  },
  strings: pageWords({ ...ONBOARDING, ...WIZARD, ...REF, ...PF, heading: PF.details, answer: PF.details, record: ONBOARDING.voice_record }),
});
