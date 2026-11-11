import { defineModule } from '../../navigation/registry';
import { connectHub } from './pages/hub/page';
import { connectIndex } from './pages/index/page';

defineModule({
  id: 'connect',
  title: 'Connect',
  summary: 'Your community and everything happening in it. Landing view and the hub of activity kinds. Mostly coming soon.',
  keywords: ['community', 'activities', 'events', 'people', 'home'],
  pages: [connectIndex, connectHub],
  skills: [],
});
