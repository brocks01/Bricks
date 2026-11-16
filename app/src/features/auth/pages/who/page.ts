import { definePage } from '../../../../kit/page';
import { whoStrings } from '../../preWords';

export const authWho = definePage({
  key: 'auth.who',
  module: 'auth',
  route: '/who',
  bare: true,
  summary: 'Screen 3 before sign-in: who is setting up Interchange (the person, or someone for a parent or grandparent). Then sign-in.',
  keywords: ['who', 'myself', 'family', 'parent', 'grandparent'],
  elements: {
    heading: { kind: 'text' },
    myself: { kind: 'action', summary: 'I am setting up Interchange for myself.' },
    family: { kind: 'action', summary: 'I am setting up Interchange for a parent or grandparent.' },
    community: { kind: 'action', agent: 'human', summary: 'Coming soon: setting up for a community or centre.' },
  },
  strings: whoStrings,
});
