import { defineModule } from '../../navigation/registry';
import { homeIndex } from './pages';

defineModule({
  id: 'home',
  title: 'Home',
  summary: 'Today at a glance: the next thing to do and how much free time there is before it, the whole day, the daily check-in and this week. The calendar behind it holds every commitment: reminders, appointments, events, bookings.',
  keywords: ['home', 'today', 'calendar', 'reminders', 'schedule'],
  pages: [homeIndex],
  skills: [],
});
