import { definePage } from '../../../../kit/page';
import { strings } from './strings';

// The Grow home, as in ui-samples/11-grow-screens.webp (screen 1). Spec: team-docs/02-product/grow-and-explore.md.
export const growIndex = definePage({
  key: 'grow.index',
  module: 'grow',
  route: '/grow',
  tab: 2,
  icon: 'heart',
  requiresAuth: true,
  summary: 'Your wellbeing, aspirations and personal journey: six cards (Health, Activity, Aspirations, Explore, My Progress, My Contributions). Only Explore is built so far.',
  keywords: ['grow', 'goals', 'health', 'wellbeing', 'learning', 'personal', 'explore', 'aspirations', 'progress'],
  elements: {
    heading: { kind: 'text' },
    health: { kind: 'action', summary: 'Open Health. Coming soon.' },
    activity: { kind: 'action', summary: 'Open Activity. Coming soon.' },
    aspirations: { kind: 'action', summary: 'Open Aspirations. Coming soon.' },
    explore: { kind: 'action', summary: 'Open Explore: discover guides, practice, stories and activities in six categories.' },
    progress: { kind: 'action', summary: 'Open My Progress. Coming soon.' },
    contributions: { kind: 'action', summary: 'Open My Contributions. Coming soon.' },
    soon: { kind: 'text', summary: 'A note that this part is coming soon.' },
  },
  strings,
});
