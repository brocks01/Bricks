import { definePage } from '../../kit/page';
import { pageWords } from '../../i18n/words';
import { ALIASES, W } from './words';

const strings = (headingWord: string) => pageWords(W, { ...ALIASES, heading: headingWord });
const base = { module: 'health', requiresAuth: true } as const;

export const healthIndex = definePage({
  ...base,
  key: 'health.index',
  route: '/health',
  tab: 4,
  icon: 'heart',
  summary: 'Health: a daily "did you move today?" check-in, this week at a glance, start a walk, walk history, the private health card, and a Help button. Wellness only, never medical advice.',
  keywords: ['health', 'walk', 'check-in', 'exercise', 'steps', 'streak', 'help', 'wellness'],
  elements: {
    heading: { kind: 'text' },
    movedYes: { kind: 'action', summary: 'Answer yes: I moved today.' },
    movedNo: { kind: 'action', summary: 'Answer no: I did not move today.' },
    feeling: { kind: 'choice', type: 'string', options: ['1', '2', '3', '4', '5'], summary: 'How the person feels today, 1 (low) to 5 (good).' },
    startWalk: { kind: 'action', summary: 'Open the walk recorder.' },
    history: { kind: 'action', summary: 'Open the list of past walks.' },
    coach: { kind: 'text', summary: 'The live exercise coach is coming soon (being built by a teammate); it will run on the phone only.' },
    card: { kind: 'action', summary: 'Open the private health card.' },
    records: { kind: 'action', summary: 'Open the readings page (heart rate, sleep, weight, blood pressure diary).' },
    help: { kind: 'action', summary: 'Open the Help page.' },
  },
  strings: strings('h_health'),
});

export const healthWalk = definePage({
  ...base,
  key: 'health.walk',
  route: '/health/walk',
  summary: 'Record a walk: time, distance and steps, with pause and finish. Uses the phone location, or a practice walk without location.',
  keywords: ['walk', 'record', 'steps', 'distance'],
  elements: {
    heading: { kind: 'text' },
    startGps: { kind: 'action', summary: 'Start a walk using the device location.' },
    startPractice: { kind: 'action', summary: 'Start a practice walk without location.' },
    pause: { kind: 'action', summary: 'Pause the walk.' },
    resume: { kind: 'action', summary: 'Continue the walk.' },
    finishWalk: { kind: 'action', summary: 'Finish the walk and see the summary.' },
    discard: { kind: 'action', agent: 'confirm', summary: 'Throw this walk away without saving.' },
    saveWalk: { kind: 'action', summary: 'Save the finished walk.' },
  },
  strings: strings('h_walk'),
});

export const healthHistory = definePage({
  ...base,
  key: 'health.history',
  route: '/health/history',
  summary: 'Past walks with this week and last week totals.',
  keywords: ['walks', 'history', 'week'],
  elements: { heading: { kind: 'text' } },
  strings: strings('h_history'),
});

export const healthCard = definePage({
  ...base,
  key: 'health.card',
  route: '/health/card',
  summary: 'The private health card: blood group, conditions, medicines, allergies and who to call. Only the person sees it.',
  keywords: ['health card', 'blood group', 'medicines', 'allergies', 'emergency contact'],
  elements: {
    heading: { kind: 'text' },
    bloodGroup: { kind: 'choice', type: 'string', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], summary: 'Blood group.' },
    conditionsField: { kind: 'field', type: 'string', summary: 'Health conditions, in the person\'s own words.' },
    medicinesField: { kind: 'field', type: 'string', summary: 'Medicines the person takes.' },
    allergiesField: { kind: 'field', type: 'string', summary: 'Allergies.' },
    contactName: { kind: 'field', type: 'string', summary: 'Who to call in an emergency.' },
    contactPhone: { kind: 'field', type: 'string', summary: 'Their phone number.' },
    saveCard: { kind: 'action', summary: 'Save the card.' },
  },
  strings: strings('h_card'),
});

export const healthHelp = definePage({
  ...base,
  key: 'health.help',
  route: '/health/help',
  summary: 'Help: call the emergency number, or tell the family. Also shows when someone in the family has asked for help.',
  keywords: ['help', 'emergency', 'sos', 'family'],
  elements: {
    heading: { kind: 'text' },
    callEmergency: { kind: 'action', agent: 'human', summary: 'Call the emergency number. Only the person decides to call; guide them in words.' },
    message: { kind: 'field', type: 'string', summary: 'A few words to send with the alert (optional).' },
    tellFamily: { kind: 'action', agent: 'confirm', summary: 'Tell the family that the person needs help. Needs the person to approve.' },
  },
  strings: strings('h_help'),
});
