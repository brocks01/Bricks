import { defineModule } from '../../navigation/registry';
import { marketDay, marketIndex, marketStall } from './pages';

defineModule({
  id: 'market',
  title: 'Marketplace',
  summary: 'The physical world nearby: market days, volunteering, paid gigs, shows and activities hosted by Active Ageing Centres, malls and others, with stalls at a market day. We bring people to what already exists. Paid sessions (services by the hour) are in Wisdom.',
  keywords: ['marketplace', 'market day', 'opportunity', 'stall', 'volunteer', 'nearby'],
  pages: [marketIndex, marketDay, marketStall],
  skills: [],
});
