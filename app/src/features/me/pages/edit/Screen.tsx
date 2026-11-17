import { useEffect } from 'react';
import { View } from 'react-native';
import { useNavigate } from '../../../../navigation';
import { colors } from '../../../../theme/tokens';

/** The old one-page profile form is gone: "edit profile" now opens the profile page, where each detail has its own edit screen. The key stays so old links and the agent still work. */
export default function EditProfile() {
  const go = useNavigate();
  useEffect(() => { go('me.index', {}, { replace: true }); }, [go]);
  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}
