import { definePage } from '../../../../kit/page';
import { signInStrings } from '../../signInWords';

export const authSignIn = definePage({
  key: 'auth.signIn',
  module: 'auth',
  route: '/sign-in',
  bare: true,
  summary: 'Sign in with Singpass (a demo for now: a mock Singpass screen offers demo profiles).',
  keywords: ['login', 'sign in', 'singpass'],
  elements: {
    heading: { kind: 'text' },
    singpass: { kind: 'action', agent: 'human', summary: 'Continue with Singpass. Only the person can do this.' },
  },
  strings: signInStrings,
});
