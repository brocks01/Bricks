import { familyApi } from '../../api/family';
import { defineModule } from '../../navigation/registry';
import { setActiveProfile } from '../../session/store';
import { familyAccounts } from './pages/accounts/page';
import { familyAssisted } from './pages/assisted/page';
import { familyClaim } from './pages/claim/page';
import { familyCreate } from './pages/create/page';
import { familyDetail } from './pages/detail/page';
import { familyHistory } from './pages/history/page';
import { familyHome } from './pages/home/page';
import { familyInvite } from './pages/invite/page';
import { familyJoin } from './pages/join/page';

defineModule({
  id: 'family',
  title: 'Family',
  summary: 'The family space: family members help each other set up and look after their Wisdom accounts, with clear levels of access and a record of everything done.',
  keywords: ['family', 'members', 'help', 'invite', 'assisted', 'delegation', 'accounts'],
  pages: [familyHome, familyCreate, familyJoin, familyDetail, familyInvite, familyAssisted, familyAccounts, familyClaim, familyHistory],
  skills: [
    {
      name: 'list',
      summary: 'List the families I belong to.',
      input: [],
      run: async (input) => {
        const r = await familyApi.mine();
        return {
          ok: true,
          summary: r.families.length ? r.families.map((f) => `${f.name} (${f.role}, ${f.member_count} members)`).join('; ') : 'No families yet.',
          data: r.families,
        };
      },
    },
    {
      name: 'create',
      summary: 'Create a family with a name; I become its owner.',
      input: [{ name: 'name', type: 'string', required: true, description: 'The name of the family.' }],
      run: async (input) => {
        const f = await familyApi.create(String(input.name ?? '').trim());
        if (!f.id) return { ok: false, summary: 'The family needs a name.' };
        return { ok: true, summary: `Created the family "${f.name}". You are its owner.`, data: { id: f.id, name: f.name } };
      },
    },
    {
      name: 'actAs',
      summary: 'Switch the app to act on behalf of a family member, or back to myself.',
      input: [{ name: 'user_id', type: 'string', required: false, description: 'Leave empty to act as myself again.' }],
      run: async (input) => {
        const r = await familyApi.held();
        const want = input.user_id ? String(input.user_id) : null;
        if (want && !r.delegations.some((d) => d.user_id === want)) return { ok: false, summary: 'I do not hold access to that account.' };
        setActiveProfile(want);
        return { ok: true, summary: want ? 'Now acting for that family member.' : 'Back to my own account.' };
      },
    },
  ],
});
