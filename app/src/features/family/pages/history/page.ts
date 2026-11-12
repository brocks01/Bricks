import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const familyHistory = definePage({
  key: 'family.history',
  module: 'family',
  route: '/family/permission-history',
  requiresAuth: true,
  summary: 'The record of everything that was done in my name: access granted, changed, revoked, the family code being used, removals. Nothing is deleted.',
  keywords: ['history', 'permissions', 'record', 'audit'],
  elements: {
    heading: { kind: 'text' },
    intro: { kind: 'text' },
  },
  strings,
});
