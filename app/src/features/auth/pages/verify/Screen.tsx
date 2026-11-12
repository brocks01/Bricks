import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Logo } from '../../../../components/headers';
import { OtpBoxes } from '../../../../components/OtpBoxes';
import { useStore } from '../../../../core/store';
import { useT } from '../../../../i18n';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useGoBack } from '../../../../navigation';
import { errorWords } from '../../../../session/errors';
import { requestCode, sessionStore, verifyCode } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { authVerify as page } from './page';

const MARK = '\u0001'; // stands in for the email while the sentence is cut in two: the words above, the address on its own line below

export default function Verify() {
  const w = usePageWords(page);
  const t = useT();
  const back = useGoBack();
  const { pendingEmail, devCode } = useStore(sessionStore);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fail = (e: unknown) => {
    const m = errorWords(e);
    setError(t(m.key, m.vars));
  };
  const verify = async () => {
    setError(null);
    setBusy(true);
    try {
      await verifyCode(code.trim()); // the gate in the root layout then opens the setup page or home
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    if (!pendingEmail) return;
    setError(null);
    try {
      await requestCode(pendingEmail);
    } catch (e) {
      fail(e);
    }
  };

  useField(page, 'code', code, (v) => setCode(String(v)));
  useAction(page, 'verify', verify);
  useAction(page, 'resend', resend);

  const [before, after] = w('hint', { email: MARK }).split(MARK);
  const ready = code.length === 6 && !busy;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Waves />
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 160 }}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} style={{ paddingTop: space.lg, alignSelf: 'flex-start' }}>
          <Ionicons name="chevron-back" size={30} color={colors.ink} />
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 }}>
          <Logo size={58} />
          <Text style={{ fontSize: 40, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 }}>Bricks</Text>
        </View>

        <Text accessibilityRole="header" style={{ fontSize: 32, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: 36 }}>{w('heading')}</Text>
        <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginTop: space.md }]}>{before.trim()}</Text>
        {pendingEmail ? <Text style={{ fontSize: 20, fontWeight: '600', color: colors.ink, textAlign: 'center', marginTop: 2 }}>{pendingEmail}</Text> : null}
        {after.replace(/[.\s。]/g, '') ? <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>{after.trim()}</Text> : null}

        {devCode ? (
          <View style={{ backgroundColor: colors.accentSoft, borderColor: colors.accentLine, borderWidth: 1, borderRadius: 16, padding: space.lg, marginTop: space.lg }}>
            <Text style={[type.body, { color: colors.ink, fontWeight: '700', textAlign: 'center' }]}>{w('devCode', { code: devCode })}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 40 }}>
          <El page={page} id="code">
            <OtpBoxes label={w('code')} value={code} onChange={setCode} error={!!error} />
          </El>
        </View>
        {error ? <Text accessibilityLiveRegion="polite" style={[type.small, { color: colors.danger, fontWeight: '600', marginBottom: space.md }]}>{error}</Text> : null}

        <El page={page} id="verify">
          <Pressable
            onPress={() => void verify()}
            disabled={!ready}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready }}
            style={({ pressed }) => ({ marginTop: 44, height: 64, borderRadius: 999, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: !ready ? 0.5 : pressed ? 0.85 : 1 })}
          >
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' }}>{w('verify')}</Text>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </Pressable>
        </El>
        <El page={page} id="resend">
          <Pressable
            onPress={() => void resend()}
            accessibilityRole="button"
            style={({ pressed }) => ({ marginTop: 20, height: 60, borderRadius: 999, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}
          >
            <Text style={{ fontSize: 19, fontWeight: '700', color: colors.accent }}>{w('resend')}</Text>
          </Pressable>
        </El>
      </ScrollView>
    </View>
  );
}

/** Two soft green hills along the bottom edge, as in the approved screen. Plain shapes, behind everything. */
function Waves() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 150, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: '-40%', bottom: -170, width: '130%', height: 260, borderRadius: '50%' as unknown as number, backgroundColor: '#EDF6EE' }} />
      <View style={{ position: 'absolute', right: '-45%', bottom: -190, width: '135%', height: 260, borderRadius: '50%' as unknown as number, backgroundColor: '#E2F0E4' }} />
    </View>
  );
}
