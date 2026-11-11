import { defineModule } from '../../navigation/registry';
import { connectIndex } from './pages/index/page';

defineModule({
  id: 'connect',
  title: 'Connect',
  summary: 'Your community and everything happening in it. Coming soon.',
  keywords: ['community', 'activities', 'events', 'people', 'home'],
  pages: [connectIndex],
  skills: [],
});
