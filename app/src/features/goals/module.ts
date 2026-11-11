import { defineModule } from '../../navigation/registry';
import { goalsIndex } from './pages/index/page';

defineModule({
  id: 'goals',
  title: 'Goals',
  summary: 'Coming soon. Nothing is built here yet.',
  keywords: ['goals', 'targets'],
  pages: [goalsIndex],
  skills: [],
});
