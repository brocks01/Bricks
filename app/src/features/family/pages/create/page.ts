import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const familyCreate = definePage({
  key: 'family.create',
  module: 'family',
  route: '/family/create',
  requiresAuth: true,
  summary: 'Create a family with a name. I become its owner and can invite helpers and members.',
  keywords: ['family', 'create', 'new', 'name'],
  elements: {
    heading: { kind: 'text' },
    intro: { kind: 'text' },
    name: { kind: 'field', type: 'string', required: true, summary: 'The name of the family, for example "The kapoor family".' },
    create: { kind: 'action', summary: 'Create the family and open it.' },
  },
  strings,
});
