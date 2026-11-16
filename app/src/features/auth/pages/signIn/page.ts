import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const authSignIn = definePage({
  key: 'auth.signIn',
  module: 'auth',
  route: '/sign-in',
  bare: true,
  summary: 'Sign in with an email code, Google, Singpass (Singapore) or DigiLocker (India).',
  keywords: ['login', 'sign in', 'email', 'google', 'singpass', 'digilocker'],
  elements: {
    heading: { kind: 'text' },
    email: { kind: 'field', type: 'string', required: true, summary: 'The email address to send a 6-digit code to.' },
    sendCode: { kind: 'action', summary: 'Sends the 6-digit code to the email address.' },
    startDemo: { kind: 'action', summary: 'Prototype: makes a throwaway account with a random name and opens the app at once, with no code.' },
    or: { kind: 'text' },
    google: { kind: 'action', agent: 'human', summary: 'Continue with Google. Only the person can do this.' },
    singpass: { kind: 'action', agent: 'human', summary: 'Continue with Singpass (Singapore). Only the person can do this.' },
    digilocker: { kind: 'action', agent: 'human', summary: 'Continue with DigiLocker (India). Only the person can do this.' },
    unavailable: { kind: 'text' },
    googleFailed: { kind: 'text' },
  },
  strings,
});
