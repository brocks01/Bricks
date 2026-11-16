import { definePage } from '../../../../kit/page';
import { signInStrings } from '../../signInWords';

export const authSignIn = definePage({
  key: 'auth.signIn',
  module: 'auth',
  route: '/sign-in',
  bare: true,
  summary: 'Verify identity with Singpass (a mock for now: it signs in Uncle Tan with what Singpass would know).',
  keywords: ['login', 'sign in', 'singpass', 'verify'],
  elements: {
    heading: { kind: 'text' },
    singpass: { kind: 'action', summary: 'Continue with Singpass (a mock for now: no real Singpass is contacted, so the agent may press it for the person).' },
  },
  strings: signInStrings,
});
