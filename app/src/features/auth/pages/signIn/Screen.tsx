import { Image, Pressable, Text, View } from 'react-native';
import { El, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { colors, space } from '../../../../theme/tokens';
import { Collage, Frame } from '../../../onboarding/kit';
import { authSignIn as page } from './page';

/** Sign in: one button, Continue with Singpass. For now it opens a mock Singpass screen that offers demo profiles. */
export default function SignIn() {
  const w = usePageWords(page);
  const go = useNavigate();
  return (
    <Frame top={<Collage />} onBack={() => go('auth.who')} backLabel={w('o_back')} inlineTitle title={w('heading')}>
      <El page={page} id="singpass">
        <Pressable onPress={() => go('auth.singpass')} accessibilityRole="button" accessibilityLabel={w('singpass')} style={{ minHeight: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
          <Text style={{ fontSize: 19, fontWeight: '700', color: colors.ink }}>{w('continueWith')}</Text>
          <Image source={require('../../../../../assets/brand/singpass.png')} accessibilityLabel="Singpass" resizeMode="contain" style={{ width: 128, height: 22 }} />
        </Pressable>
      </El>
      <View style={{ height: space.lg }} />
    </Frame>
  );
}
