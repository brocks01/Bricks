import { definePage } from '../../../../kit/page';
import { signInStrings } from '../../signInWords';

export const authSignIn = definePage({
  key: 'auth.signIn',
  module: 'auth',
  route: '/sign-in',
  bare: true,
  summary: 'Sign in, laid out like the reference: a picture on top, then Continue with Singpass, Continue with Email, and Try it as someone new.',
  keywords: ['login', 'sign in', 'singpass', 'email', 'new account'],
  elements: {
    heading: { kind: 'text' },
    singpass: { kind: 'action', summary: 'Continue with Singpass. A mock for now: no real Singpass is contacted and it always signs in Uncle Tan, so the agent may press it for the person.' },
    email: { kind: 'field', type: 'string', summary: 'The email address to send a sign-in code to.' },
    sendCode: { kind: 'action', summary: 'Sends a sign-in code to that email address.' },
    code: { kind: 'field', type: 'string', agent: 'human', summary: 'The six-digit code from the email. Only the person types it.' },
    tryNew: { kind: 'action', summary: 'Starts a brand-new account (a demo) that goes through the first questions.' },
  },
  strings: signInStrings,
});
