import { Ionicons } from '@expo/vector-icons';
import { Image, Text, View } from 'react-native';
import { usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { Brand, Go, R, RefFrame } from '../../../onboarding/ref';
import { authWelcome as page } from './page';

/** Screen 1: Welcome to Interchange. A big friendly picture, one line about what this is, a note that help is at hand, and Get started. */
export default function Welcome() {
  const w = usePageWords(page);
  const go = useNavigate();
  const start = () => { go('auth.language'); };
  usePageData(page, {
    values: [{ label: w('x_welcome'), value: w('x_welcome_sub') }, { label: w('x_help_t'), value: w('x_help_b') }],
    images: [],
    lists: [],
    actions: [{ id: 'start', label: w('x_start'), run: start }],
  });
  return (
    <RefFrame at={0} hideBrand bottom={<Go label={w('x_start')} trailing="arrow-forward" onPress={start} />}>
      <View style={{ alignItems: 'center', marginTop: 8 }}><Brand big /></View>
      <Text accessibilityRole="header" style={{ fontSize: 38, lineHeight: 44, fontWeight: '800', color: R.ink, marginTop: 14 }}>{w('x_welcome')}</Text>
      <Text style={{ fontSize: 18, lineHeight: 25, color: R.muted, marginTop: 8 }}>{w('x_welcome_sub')}</Text>
      <View style={{ marginTop: 18, borderRadius: 22, overflow: 'hidden', backgroundColor: R.card }}>
        <Image source={require('../../../../../assets/images/singapore-seniors.jpg')} accessibilityLabel="Seniors together at a Singapore community corner" resizeMode="cover" style={{ width: '100%', height: 230 }} />
        <View style={{ flexDirection: 'row', gap: 12, padding: 16, backgroundColor: R.peach }}>
          <Ionicons name="people" size={28} color={R.orange} accessible={false} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: R.ink }}>{w('x_help_t')}</Text>
            <Text style={{ fontSize: 15, lineHeight: 21, color: R.muted, marginTop: 2 }}>{w('x_help_b')}</Text>
          </View>
        </View>
      </View>
    </RefFrame>
  );
}
