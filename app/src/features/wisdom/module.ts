import { defineModule } from '../../navigation/registry';
import { wisdomAsk, wisdomIndex, wisdomMyServices, wisdomOffer, wisdomService, wisdomServiceOffer, wisdomStory, wisdomSupport } from './pages';

defineModule({
  id: 'wisdom',
  title: 'Wisdom',
  summary: 'Where experience is passed between generations: shared stories and lessons, mentors who offer to teach, what people want to learn, paid sessions by the hour, and the introductions between them. A person sees it when they want to share, learn or help.',
  keywords: ['wisdom', 'stories', 'mentor', 'learn', 'teach', 'generations', 'paid', 'session'],
  pages: [wisdomIndex, wisdomStory, wisdomOffer, wisdomAsk, wisdomSupport, wisdomService, wisdomServiceOffer, wisdomMyServices],
  skills: [],
});
