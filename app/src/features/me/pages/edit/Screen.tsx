import { BackScreen } from '../../../../components/BackButton';
import { usePageWords } from '../../../../kit';
import { ProfileForm } from '../../ProfileForm';
import { meEdit as page } from './page';

export default function EditProfile() {
  const w = usePageWords(page);
  return (
    <BackScreen title={w('heading')}>
      <ProfileForm page={page} destination="me.index" />
    </BackScreen>
  );
}
