import { definePage } from '../../kit/page';
import { strings } from './startStrings';

// Join a community with an invite code, or start one. Reached from the "Join or create a community" button on Connect.
const base = { module: 'connect', requiresAuth: true, strings } as const;

export const connectJoin = definePage({
  ...base,
  key: 'connect.join',
  route: '/join-community',
  summary: 'Join a community by typing the invite code a community leader gave you; or choose to start a community of your own.',
  keywords: ['join', 'community', 'invite code', 'code'],
  elements: {
    code: { kind: 'field', type: 'string', required: true, summary: 'The invite code, for example ABCD-2345.' },
    joinButton: { kind: 'action', agent: 'confirm', summary: 'Join the community with the code.' },
    goCreate: { kind: 'action', summary: 'Open the form to create a new community.' },
  },
});

export const connectCreate = definePage({
  ...base,
  key: 'connect.create',
  route: '/create-community',
  summary: 'A form to start a new community: its name, what kind it is, the area and a short description. The person becomes its Community Lead.',
  keywords: ['create', 'community', 'start', 'new'],
  elements: {
    name: { kind: 'field', type: 'string', required: true, summary: 'The name of the community.' },
    kind: { kind: 'choice', type: 'string', options: ['apartment', 'block', 'neighbourhood', 'club', 'other'], summary: 'What kind of community it is.' },
    area: { kind: 'field', type: 'string', summary: 'The area or address it covers.' },
    about: { kind: 'field', type: 'string', summary: 'A short description.' },
    createButton: { kind: 'action', agent: 'confirm', summary: 'Create the community.' },
  },
});
