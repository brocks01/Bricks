import { useEffect, useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { startDemo } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { Frame } from '../../../onboarding/kit';
import { authSingpass as page } from './page';

/** A mock Singpass login. No real Singpass is contacted: it makes a brand-new account straight away and the app moves on to the first questions by itself. */
export default function SingpassMock() {
  const w = usePageWords(page);
  const go = useNavigate();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const run = () => {
    setFailed(false);
    startDemo().catch(() => setFailed(true)); // on success the app moves on by itself (AuthGate)
  };
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
