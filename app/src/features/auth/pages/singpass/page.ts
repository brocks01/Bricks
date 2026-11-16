import { definePage } from '../../../../kit/page';
import { singpassStrings } from '../../signInWords';

export const authSingpass = definePage({
  key: 'auth.singpass',
  module: 'auth',
  route: '/singpass',
  bare: true,
  summary: 'A mock Singpass login (no real Singpass is contacted): it makes a new account at once and goes on to the first questions.',
  keywords: ['singpass', 'demo', 'profile', 'login'],
  elements: {
    heading: { kind: 'text' },
  },
  strings: singpassStrings,
});
