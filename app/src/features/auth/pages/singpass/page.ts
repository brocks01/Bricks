import { definePage } from '../../../../kit/page';
import { singpassStrings } from '../../signInWords';

export const authSingpass = definePage({
  key: 'auth.singpass',
  module: 'auth',
  route: '/singpass',
  bare: true,
  summary: 'A mock Singpass login (no real Singpass is contacted): choose a demo profile to continue as, or start a new one.',
  keywords: ['singpass', 'demo', 'profile', 'login'],
  elements: {
    heading: { kind: 'text' },
    newProfile: { kind: 'action', agent: 'human', summary: 'Start a new demo profile with a random name.' },
  },
  strings: singpassStrings,
});
