import { defineModule } from '../../navigation/registry';
import { connectIndex } from './pages/index/page';
import { connectCreate, connectJoin } from './pages';

defineModule({
  id: 'connect',
  title: 'Connect',
  summary: 'Your community and everything happening in it: a greeting, the join-or-create entry (join with an invite code, or create a community), and the next events.',
  keywords: ['community', 'activities', 'events', 'people', 'home'],
  pages: [connectIndex, connectJoin, connectCreate],
  skills: [],
});
