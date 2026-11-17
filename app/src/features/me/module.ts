import { defineModule } from '../../navigation/registry';
import { sessionStore } from '../../session/store';
import { meEdit } from './pages/edit/page';
import { meField } from './pages/field/page';
import { meIndex } from './pages/index/page';

defineModule({
  id: 'me',
  title: 'Me',
  summary: 'Your own page: every detail from onboarding (each opens its own edit screen), sign out, and more (health, family, emergency numbers, reminder calls).',
  keywords: ['me', 'profile', 'account', 'settings', 'privacy'],
  pages: [meIndex, meEdit, meField],
  skills: [
    {
      name: 'summary',
      summary: 'Say what the profile holds: name, age group, phone and area (never the email code).',
      input: [],
      run: () => {
        const u = sessionStore.get().user;
        if (!u) return { ok: false, summary: 'Nobody is signed in.' };
        return { ok: true, summary: `${u.display_name ?? 'No name yet'}, age group ${u.age_band ?? 'not set'}, area ${u.area_name ?? 'not set'}.`, data: { name: u.display_name, ageBand: u.age_band, phone: u.phone, area: u.area_name, language: u.language } };
      },
    },
  ],
});
