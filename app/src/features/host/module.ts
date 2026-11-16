import { defineModule } from '../../navigation/registry';
import { hostHome } from './pages';

// My host: the host's own people list, make, edit and cancel what runs at their host. We are not the event provider:
// the host runs it (a market day, a volunteering slot, a paid gig, a show, an activity) and we bring people to it.
defineModule({
  id: 'host',
  title: 'My host',
  summary: 'Hosts list their own opportunities: the owner and editors of an Active Ageing Centre, a mall or a community centre add what is coming up there, and cancel what they must. Payment stays direct between people; we never hold money.',
  keywords: ['host', 'centre', 'mall', 'opportunity', 'market day', 'listing', 'add'],
  pages: [hostHome],
  skills: [],
});
