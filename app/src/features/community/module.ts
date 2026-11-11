import { defineModule } from '../../navigation/registry';
import { communityIndex } from './pages/index/page';

defineModule({
  id: 'community',
  title: 'Community',
  summary: 'Coming soon. Nothing is built here yet.',
  keywords: ['community', 'neighbourhood'],
  pages: [communityIndex],
  skills: [],
});
