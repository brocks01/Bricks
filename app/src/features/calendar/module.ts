import { calendarApi } from '../../api/calendar';
import { defineModule } from '../../navigation/registry';
import { calendarCalls } from './pages/calls/page';
import { calendarItem } from './pages/item/page';
import { calendarNew } from './pages/new/page';
import { calendarToday } from './pages/today/page';

// The agent's skills for the calendar. Plain words only: the person never hears "occurrence" or
// "item". Acting for a family member goes through the active profile (the server re-checks the
// live access on every call, so it never trusts the model).
const KINDS = ['medicine', 'appointment', 'exercise', 'event', 'other'];

defineModule({
  id: 'calendar',
  title: 'Calendar',
  summary: 'What is planned for one person: medicines, appointments, exercise and events, with marks for done and skipped. A family member with access can plan for somebody else.',
  keywords: ['calendar', 'today', 'plan', 'medicine', 'appointment', 'reminders', 'family'],
  pages: [calendarToday, calendarNew, calendarItem, calendarCalls],
  skills: [
    {
      name: 'today',
      summary: 'Say what is planned on the calendar in the next two days, and what was missed.',
      input: [],
      run: async () => {
        const r = await calendarApi.occurrences();
        const m = await calendarApi.missed();
        const now = Date.now();
        const soon = r.occurrences.filter((o) => new Date(o.occurs_at).getTime() < now + 48 * 3600_000);
        const words = (o: (typeof soon)[number]) => {
          const when = new Date(o.occurs_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
          const state = o.status === 'done' ? ', done' : o.status === 'skipped' ? ', skipped' : '';
          return `at ${when}: ${o.title}${state}`;
        };
        const missedWords = m.missed.slice(0, 5).map((x) => x.title);
        const summary = soon.length
          ? soon.slice(0, 8).map(words).join('; ')
          : 'Nothing planned in the next two days.';
        return {
          ok: true,
          summary: missedWords.length ? `${summary}. Missed earlier and unticked: ${missedWords.join(', ')}.` : summary,
          data: { occurrences: r.occurrences, missed: m.missed },
        };
      },
    },
    {
      name: 'add',
      summary: 'Add a plan to the calendar: what kind, what it is, the day and the time, and how often it repeats. The person approves first.',
      input: [
        { name: 'kind', type: 'string', required: true, description: 'medicine, appointment, exercise, event or other.' },
        { name: 'title', type: 'string', required: true, description: 'What it is, for example blood pressure tablet.' },
        { name: 'date', type: 'string', required: true, description: 'The first day as YYYY-MM-DD.' },
        { name: 'time', type: 'string', required: true, description: 'The time as HH:MM, 24 hour.' },
        { name: 'repeat', type: 'string', required: false, description: 'none (once), daily (every day), weekdays (Mon to Fri) or weekly. Default none.' },
        { name: 'note', type: 'string', required: false, description: 'An optional note, for example after breakfast.' },
      ],
      confirm: true,
      run: async (input) => {
        const kind = String(input.kind ?? '').trim();
        const title = String(input.title ?? '').trim();
        const date = String(input.date ?? '').trim();
        const time = String(input.time ?? '').trim();
        if (!KINDS.includes(kind)) return { ok: false, summary: 'The kind must be medicine, appointment, exercise, event or other.' };
        if (!title) return { ok: false, summary: 'Say what the plan is, for example blood pressure tablet.' };
        const when = new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)),
          Number(time.slice(0, 2)), Number(time.slice(3, 5)));
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || Number.isNaN(when.getTime())) {
          return { ok: false, summary: 'I need the day and the time, for example 2026-11-20 and 08:00.' };
        }
        const repeatRaw = String(input.repeat ?? 'none');
        const repeat = (['none', 'daily', 'weekdays', 'weekly'].includes(repeatRaw) ? repeatRaw : 'none') as 'none' | 'daily' | 'weekdays' | 'weekly';
        const r = await calendarApi.create({ kind: kind as 'medicine', title, starts_at: when.toISOString(), repeat, note: input.note ? String(input.note) : undefined });
        const how = repeat === 'daily' ? ', every day' : repeat === 'weekdays' ? ', Monday to Friday' : repeat === 'weekly' ? ', on chosen days of the week' : '';
        const clash = r.warnings[0];
        const warn = clash
          ? clash.why === 'duplicate'
            ? ` It is at the same minute as "${clash.with_title}".`
            : ` It is ${clash.gap_min} min from "${clash.with_title}".`
          : '';
        return { ok: true, summary: `Added "${title}" on ${date} at ${time}${how}.${warn}`, data: { id: r.id, warnings: r.warnings } };
      },
    },
    {
      name: 'done',
      summary: 'Mark one planned thing as done. Take the plan id and the exact time from the today list.',
      input: [
        { name: 'item_id', type: 'string', required: true, description: 'The plan id from the today list.' },
        { name: 'occurs_at', type: 'string', required: true, description: 'The exact time of that plan from the today list (occurs_at).' },
      ],
      run: async (input) => {
        const itemId = String(input.item_id ?? '').trim();
        const occursAt = String(input.occurs_at ?? '').trim();
        if (!itemId || !occursAt) return { ok: false, summary: 'I need the plan and its time from the today list.' };
        await calendarApi.mark(itemId, occursAt, 'done');
        return { ok: true, summary: 'Marked as done.', data: { item_id: itemId, occurs_at: occursAt } };
      },
    },
  ],
});
