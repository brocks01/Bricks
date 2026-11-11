import { defineModule } from '../../navigation/registry';
import { growIndex } from './pages/index/page';

defineModule({
  id: 'grow',
  title: 'Grow',
  summary: 'Your personal goals, health and learning. Coming soon.',
  keywords: ['goals', 'health', 'wellbeing', 'learning', 'personal'],
  pages: [growIndex],
  skills: [],
});
