import { pageWords } from '../../i18n/words';
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
  summary: 'Getting to know the person, one short part at a time: about them, what they want here, their say over their information, then optional parts. Every question comes from the server.',
  keywords: ['onboarding', 'welcome', 'about you', 'setup', 'questions'],
  elements: {
    heading: { kind: 'text', summary: 'The name of the part the person is on.' },
    save: { kind: 'action', summary: 'Save the answers on this part and go to the next one.' },
    skip: { kind: 'action', summary: 'Skip this optional part.' },
    later: { kind: 'action', summary: 'Finish the rest later and go to the app.' },
    whoMyself: { kind: 'action', summary: 'I am setting up Wisdom for myself.' },
    whoFamily: { kind: 'action', summary: 'I am setting up Wisdom for a parent or grandparent.' },
    whoCommunity: { kind: 'action', agent: 'human', summary: 'Coming soon: setting up Wisdom for a community or centre.' },
    voiceRecord: { kind: 'action', summary: 'Start recording the optional ten-second introduction.' },
    voiceStop: { kind: 'action', summary: 'Stop recording.' },
    voicePlay: { kind: 'action', summary: 'Play back the recorded introduction.' },
    voiceAgain: { kind: 'action', summary: 'Record the introduction again.' },
    voiceNext: { kind: 'action', summary: 'Save the introduction (if any) and continue.' },
    voiceSkip: { kind: 'action', summary: 'Skip the introduction for now.' },
  },
  strings: pageWords(ONBOARDING),
});
