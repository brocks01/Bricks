import { defineModule } from '../../navigation/registry';
import { safetyAdmin, safetyBlock, safetyIndex, safetyReport } from './pages';

defineModule({
  id: 'safety',
  title: 'Safety',
  summary: 'Report something unsafe, unkind, spam or false; block a person so the two stay apart everywhere; and for the Interchange team, review open reports and dismiss, hide or suspend. Every report is read by a person, never told to anyone.',
  keywords: ['safety', 'report', 'block', 'review', 'unsafe', 'spam', 'admin'],
  pages: [safetyIndex, safetyReport, safetyBlock, safetyAdmin],
  skills: [],
});
