import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const familyAssisted = definePage({
  key: 'family.assisted',
  module: 'family',
  route: '/family/[id]/assisted',
  params: ['id'],
  requiresAuth: true,
  summary: 'Set up a Wisdom account for a family member who cannot do it themselves: their name, language and how they belong to us. No email is asked; they can take the account over later with a family code.',
  keywords: ['assisted', 'set up', 'someone else', 'grandparent', 'help'],
  elements: {
    heading: { kind: 'text' },
    intro: { kind: 'text' },
    name: { kind: 'field', type: 'string', required: true, summary: 'Their name, as we say it in the family.' },
    language: { kind: 'choice', type: 'string', required: true, options: ['en', 'hi', 'bn', 'ta', 'zh', 'ms'], summary: 'The language the app will use for them.' },
    relationship: { kind: 'field', type: 'string', summary: 'How they belong to us, for example "Grandfather".' },
    create: { kind: 'action', summary: 'Create their account and start helping.' },
  },
  strings,
});
