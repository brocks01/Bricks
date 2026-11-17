import { pageWords } from '../../i18n/words';
import { WIZARD } from './wizardWords';
import { REF } from './referenceWords';
import { definePage } from '../../kit/page';
import { ONBOARDING, START } from './words';

// The front door at "/": sends a signed-in person to their first tab.
export const onboardingStart = definePage({
  key: 'onboarding.start',
  module: 'onboarding',
  route: '/',
  requiresAuth: true,
  bare: true,
  summary: 'The front door: a moment while the app opens the first tab for this person.',
  keywords: ['start', 'front door'],
  elements: { heading: { kind: 'text', summary: 'Wisdom.' } },
  strings: pageWords(START),
});

// Onboarding: the steps and the questions come from the backend (GET /v1/onboarding), so the same steps can also be answered on a phone call or in a chat.
export const onboardingIndex = definePage({
  key: 'onboarding.index',
  module: 'onboarding',
  route: '/onboarding',
  requiresAuth: true,
  bare: true,
  summary: 'Getting started, a few short screens: the name, where the person lives, what they enjoy, a short voice introduction, how to remind them, then welcome. The agent can read each screen, fill the name or area, pick an option and press Next or Skip.',
  keywords: ['onboarding', 'welcome', 'about you', 'setup', 'name', 'where do you live', 'interests'],
  elements: {
    heading: { kind: 'text', summary: 'The question on this screen.' },
    name: { kind: 'field', type: 'string', summary: 'What to call the person (their name).' },
    area: { kind: 'field', type: 'string', summary: 'The area or town where the person lives.' },
  },
  strings: pageWords({ ...ONBOARDING, ...WIZARD, ...REF, name: WIZARD.o_name_f, area: WIZARD.o_town_f }),
});
