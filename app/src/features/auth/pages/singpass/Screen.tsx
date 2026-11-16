import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { startSingpass } from '../../../../session/store';
import { Go, R, RefFrame } from '../../../onboarding/ref';
import { authSingpass as page } from './page';

/** The mock Singpass login. No real Singpass is contacted: the server makes Uncle Tan's account with what Singpass would know, and the app moves on by itself. */
export default function SingpassMock() {
  const w = usePageWords(page);
  const go = useNavigate();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const run = () => {
    setFailed(false);
    startSingpass().catch(() => setFailed(true)); // on success the app moves on by itself (AuthGate)
  };
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, []);

  return (
    <RefFrame at={2} onBack={() => go('auth.signIn')} backLabel={w('x_back')} bottom={failed ? <Go label={w('x_retry')} onPress={run} /> : undefined}>
      <View style={{ alignItems: 'center', paddingTop: 80, gap: 18 }}>
        <Image source={require('../../../../../assets/brand/singpass.png')} accessibilityLabel="Singpass" resizeMode="contain" style={{ width: 220, height: 38 }} />
        {failed ? null : <ActivityIndicator size="large" color={R.green} />}
        <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '800', color: R.ink, textAlign: 'center' }}>{failed ? w('x_failed') : w('x_logging')}</Text>
        <Text style={{ fontSize: 16, color: R.muted, textAlign: 'center' }}>{w('x_demo')}</Text>
      </View>
    </RefFrame>
  );
}
