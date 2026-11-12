import { definePage } from '../../../../kit/page';
import { strings } from './strings';

// The person with an assisted profile takes their own account: the code a family member showed them in
// person, plus their own contact. No sign-in needed - the code IS the way in.
export const familyClaim = definePage({
  key: 'family.claim',
  module: 'family',
  route: '/claim',
  bare: true,
  summary: 'Take over my own account with the 6-digit family code someone showed me and my own contact.',
  keywords: ['claim', 'own account', 'code', 'take over'],
  elements: {
    heading: { kind: 'text' },
    intro: { kind: 'text' },
    code: { kind: 'field', type: 'string', required: true, summary: 'The 6-digit code the family member read out.' },
    email: { kind: 'field', type: 'string', required: true, summary: 'My own contact: my email address.' },
    claim: { kind: 'action', summary: 'Make the account mine and sign in.' },
  },
  strings,
});
