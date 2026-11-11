import { ProfileForm } from '../../../me/ProfileForm';
import { Screen } from '../../../../components/ui';
import { usePageWords } from '../../../../kit';
import { authSetup as page } from './page';

// First-time profile. The form is shared with Edit profile (features/me/ProfileForm).
export default function Setup() {
  const w = usePageWords(page);
  return (
    <Screen title={w('heading')} subtitle={w('subtitle')} plain>
      <ProfileForm page={page} destination="home.index" />
    </Screen>
  );
}
