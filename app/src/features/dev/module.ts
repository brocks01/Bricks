import { defineModule } from '../../navigation/registry';
import { devConsole } from './pages/console/page';

defineModule({
  id: 'dev',
  title: 'Developer tools',
  summary: 'A test console for the agent tools. For developers only.',
  keywords: ['developer', 'debug', 'console'],
  pages: [devConsole],
  skills: [],
});
