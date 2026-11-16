import { pageWords } from '../../i18n/words';
import { WIZARD } from './wizardWords';
import { REF } from './referenceWords';
import { FLOW } from './refWords';
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
  summary: 'Getting started after Singpass, three short screens: the assistant asks what the person did before retirement and what they enjoy, the profile to check and confirm (Looks right or Edit), then you are all set. The agent can read each screen, fill the name or area, pick an option and press Next or Skip.',
  keywords: ['onboarding', 'welcome', 'about you', 'setup', 'name', 'where do you live', 'interests'],
  elements: {
    heading: { kind: 'text', summary: 'The question on this screen.' },
    answer: { kind: 'field', type: 'string', summary: 'The answer to the assistant question (what the person did before retirement, then what they enjoy). The person may say or type it in any language.' },
  },
  strings: pageWords({ ...ONBOARDING, ...WIZARD, ...REF, ...FLOW, answer: FLOW.x_type }),
});
