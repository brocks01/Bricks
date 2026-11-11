import { defineModule } from '../../navigation/registry';
import { growActivity } from './pages/activity/page';
import { growAspirations } from './pages/aspirations/page';
import { growContributions } from './pages/contributions/page';
import { growHealth } from './pages/health/page';
import { growIndex } from './pages/index/page';
import { growProgress } from './pages/progress/page';

defineModule({
  id: 'grow',
  title: 'Grow',
  summary: 'Your wellbeing, aspirations and personal journey: health records, activity, aspirations, progress and contributions. Explore is its own module.',
  keywords: ['goals', 'health', 'wellbeing', 'learning', 'personal'],
  pages: [growIndex, growHealth, growActivity, growAspirations, growProgress, growContributions],
  skills: [],
});
