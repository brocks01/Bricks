import { useEffect } from 'react';
import { View } from 'react-native';
import { useStore } from '../../../core/store';
import { useNavigate } from '../../../navigation';
import { colors } from '../../../theme/tokens';
import { firstTab, profileStore } from '../state';

/** "/": once the server has said who this person is, go to their first tab. */
export default function Start() {
  const go = useNavigate();
  const { loaded, profile } = useStore(profileStore);
  useEffect(() => {
    if (loaded) go(firstTab(profile), {}, { replace: true });
  }, [loaded, profile, go]);
  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}
