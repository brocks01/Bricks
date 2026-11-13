import { defineModule } from '../../navigation/registry';
import { calendarItem } from './pages/item/page';
import { calendarNew } from './pages/new/page';
import { calendarToday } from './pages/today/page';

defineModule({
  id: 'calendar',
  title: 'Calendar',
  summary: 'What is planned for one person: medicines, appointments, exercise and events, with marks for done and skipped. A family member with access can plan for somebody else.',
  keywords: ['calendar', 'today', 'plan', 'medicine', 'appointment', 'reminders', 'family'],
  pages: [calendarToday, calendarNew, calendarItem],
  skills: [],
});
