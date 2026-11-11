import { Screen } from '../../../../components/ui';
import { usePageWords } from '../../../../kit';
import { ProfileForm } from '../../ProfileForm';
import { meEdit as page } from './page';

export default function EditProfile() {
  const w = usePageWords(page);
  return (
    <Screen title={w('heading')} back>
      <ProfileForm page={page} destination="me.index" />
    </Screen>
  );
}
