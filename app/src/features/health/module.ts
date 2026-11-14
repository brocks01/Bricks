import { defineModule } from '../../navigation/registry';
import { healthCard, healthHelp, healthHistory, healthIndex, healthWalk } from './pages';

defineModule({
  id: 'health',
  title: 'Health',
  summary: 'Staying well, as a wellness tool: a daily check-in, walks, a private health card and a Help button to the family. Never medical advice.',
  keywords: ['health', 'wellness', 'walk', 'exercise', 'help'],
  pages: [healthIndex, healthWalk, healthHistory, healthCard, healthHelp],
  skills: [],
});
