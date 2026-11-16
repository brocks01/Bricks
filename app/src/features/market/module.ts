import { defineModule } from '../../navigation/registry';
import { marketDay, marketIndex, marketListing, marketMine, marketOffer, marketStall } from './pages';

defineModule({
  id: 'market',
  title: 'Marketplace',
  summary: 'Seniors list what they can do with their experience and proof; people and community leaders book them; people who had the service say thank you; market days have stalls with helpers. Payment is direct, never through us.',
  keywords: ['marketplace', 'services', 'skills', 'hire', 'stall', 'market day'],
  pages: [marketIndex, marketDay, marketOffer, marketListing, marketMine, marketStall],
  skills: [],
});
