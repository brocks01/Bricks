import { useTranslation } from 'react-i18next';

import type { FamilyInvite } from '@/api/types';

/** "Dad", "Mum", "Grandma"… or their name for anyone else. */
export function useRelationName() {
  const { t } = useTranslation();
  return (invite: Pick<FamilyInvite, 'relation' | 'senior_name'>) =>
    invite.relation === 'other' ? invite.senior_name : t(`family.called.${invite.relation}`);
}
