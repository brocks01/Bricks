import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { El, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { Go, R, RefFrame, type Icon } from '../../../onboarding/ref';
import { authSignIn as page } from './page';

/** Screen 3: Verify your identity with Singpass. Continue opens the mock Singpass screen, which signs in Uncle Tan. */
export default function SignIn() {
  const w = usePageWords(page);
  const go = useNavigate();
  const [open, setOpen] = useState(false);
  const cont = () => { go('auth.singpass'); };
  usePageData(page, {
    values: [{ label: w('x_ver_t'), value: w('x_ver_sub') }],
    images: [],
    lists: [],
    actions: [{ id: 'continue', label: w('x_singpass'), run: cont }, { id: 'back', label: w('x_back'), run: () => { go('auth.language'); } }],
  });
  const bullets: { icon: Icon; key: string }[] = [{ icon: 'shield-checkmark-outline', key: 'x_ver_1' }, { icon: 'people', key: 'x_ver_2' }, { icon: 'lock-closed-outline', key: 'x_ver_3' }];
  return (
    <RefFrame at={2} onBack={() => go('auth.language')} backLabel={w('x_back')}
      bottom={<El page={page} id="singpass"><Go label={w('x_singpass')} icon="open-outline" onPress={cont} /></El>}>
      <Text accessibilityRole="header" style={{ fontSize: 32, lineHeight: 38, fontWeight: '800', color: R.ink, marginTop: 14 }}>{w('x_ver_t')}</Text>
      <Text style={{ fontSize: 18, lineHeight: 25, color: R.muted, marginTop: 8 }}>{w('x_ver_sub')}</Text>

      <View style={{ alignItems: 'center', marginTop: 20 }}>
        <View style={{ width: 170, height: 200, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 6, borderBottomWidth: 0, borderColor: '#2B2F3A', backgroundColor: R.card, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={require('../../../../../assets/brand/singpass.png')} accessibilityLabel="Singpass" resizeMode="contain" style={{ width: 130, height: 40 }} />
          <View style={{ position: 'absolute', right: -26, bottom: 22, width: 54, height: 54, borderRadius: 27, backgroundColor: R.green, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={32} color="#FFFFFF" accessible={false} />
          </View>
        </View>
      </View>

      <View style={{ marginTop: 18, padding: 16, borderRadius: 18, backgroundColor: R.peach, gap: 14 }}>
        {bullets.map((b) => (
          <View key={b.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Ionicons name={b.icon} size={26} color={R.green} accessible={false} />
            <Text style={{ flex: 1, fontSize: 17, lineHeight: 23, fontWeight: '600', color: R.ink }}>{w(b.key)}</Text>
          </View>
        ))}
      </View>

      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ alignSelf: 'center', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <Text style={{ fontSize: 17, fontWeight: '700', color: R.green, textDecorationLine: 'underline' }}>{w('x_data')}</Text>
        <Ionicons name="information-circle-outline" size={20} color={R.green} accessible={false} />
      </Pressable>
      {open ? <Text style={{ fontSize: 16, lineHeight: 23, color: R.muted, padding: 14, borderRadius: 14, backgroundColor: R.card, borderWidth: 1, borderColor: R.line }}>{w('x_data_b')}</Text> : null}
    </RefFrame>
  );
}
