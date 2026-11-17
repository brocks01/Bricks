import { useEffect, useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { onboardingLocal } from '../../../onboarding/state';
import { startSingpass } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { Frame } from '../../../onboarding/kit';
import { authSingpass as page } from './page';

/** A mock Singpass login. No real Singpass is contacted: it always signs in Uncle Tan, and the app moves on by itself to the onboarding pages, prefilled with what his account has. */
export default function SingpassMock() {
  const w = usePageWords(page);
  const go = useNavigate();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const run = () => {
    setFailed(false);
    onboardingLocal.walk = true; // after Singpass, every onboarding page (name, where, enjoy, voice, reminders, welcome)
    startSingpass().catch(() => setFailed(true)); // on success the app moves on by itself (AuthGate)
  };
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, []);

  return (
    <Frame onBack={() => go('auth.signIn')} backLabel={w('o_back')} primary={failed ? { label: w('sp_retry'), onPress: run } : undefined}>
      <View style={{ alignItems: 'center', paddingTop: space.xl * 2, gap: space.lg }}>
        <Image source={require('../../../../../assets/brand/singpass.png')} accessibilityLabel="Singpass" resizeMode="contain" style={{ width: 220, height: 38 }} />
        <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '800', color: colors.ink, textAlign: 'center' }}>{failed ? w('failed') : w('sp_logging')}</Text>
        <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>{w('sp_demo_note')}</Text>
      </View>
    </Frame>
  );
}
