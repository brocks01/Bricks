import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const authVerify = definePage({
  key: 'auth.verify',
  module: 'auth',
  route: '/verify',
  bare: true,
  summary: 'Type the 6-digit code that was emailed to you.',
  keywords: ['code', 'otp', 'verify'],
  elements: {
    heading: { kind: 'text' },
    hint: { kind: 'text' },
    code: { kind: 'field', type: 'string', required: true, secret: true, agent: 'human', summary: 'The 6-digit code from the email. Only the person types it.' },
    verify: { kind: 'action', summary: 'Checks the code and signs in.' },
    resend: { kind: 'action', summary: 'Sends a new code.' },
    devCode: { kind: 'text' },
  },
  strings,
});
