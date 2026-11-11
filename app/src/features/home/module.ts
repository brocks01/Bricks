import { defineModule } from '../../navigation/registry';
import { homeIndex } from './pages/index/page';

defineModule({
  id: 'home',
  title: 'Home',
  summary: 'Coming soon. Nothing is built here yet.',
  keywords: ['start', 'main'],
  pages: [homeIndex],
  skills: [],
});
