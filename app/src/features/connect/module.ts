import { defineModule } from '../../navigation/registry';
import { connectIndex } from './pages/index/page';

defineModule({
  id: 'connect',
  title: 'Connect',
  summary: 'Your community and everything happening in it: a greeting, the join-or-create card, and the nine areas of a community. Mostly coming soon.',
  keywords: ['community', 'activities', 'events', 'people', 'home'],
  pages: [connectIndex],
  skills: [],
});
