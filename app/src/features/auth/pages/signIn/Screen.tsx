// Sign in, laid out like the reference picture (04): a picture on top, the name and one line about the app, then the ways in, one under the other:
// Continue with Singpass (the main one; a mock that signs in Uncle Tan), Continue with Email (a code by email), and Try it as someone new (a demo account
// that goes through the first questions). The terms line sits at the bottom. Our own colours, words and pictures.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../../../core/store';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { requestCode, sessionStore, startDemo, verifyCode } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { Collage } from '../../../onboarding/kit';
import { authSignIn as page } from './page';

const okEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

function Button({ label, onPress, dark, icon, busy, logo }: { label: string; onPress: () => void; dark?: boolean; icon?: keyof typeof Ionicons.glyphMap; busy?: boolean; logo?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: dark ? colors.ink : colors.card, borderWidth: dark ? 0 : 1, borderColor: colors.line, opacity: pressed || busy ? 0.8 : 1 })}>
      {busy ? <ActivityIndicator color={dark ? colors.card : colors.ink} /> : icon ? <Ionicons name={icon} size={22} color={dark ? colors.card : colors.ink} accessible={false} /> : null}
      <Text style={{ fontSize: 19, fontWeight: '700', color: dark ? colors.card : colors.ink }}>{label}</Text>
      {logo ? <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.card }}><Image source={require('../../../../../assets/brand/singpass.png')} accessibilityLabel="Singpass" resizeMode="contain" style={{ width: 78, height: 14 }} /></View> : null}
    </Pressable>
  );
}

export default function SignIn() {
  const w = usePageWords(page);
  const go = useNavigate();
  const insets = useSafeAreaInsets();
  const { devCode, pendingEmail } = useStore(sessionStore);
  const [mode, setMode] = useState<'ways' | 'email' | 'code'>('ways');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const singpass = () => go('auth.singpass');
  const send = async () => {
    setError(null);
    if (!okEmail(email)) { setError(w('bad_email')); return; }
    setBusy('send');
    try { await requestCode(email.trim()); setMode('code'); } catch { setError(w('not_now')); } finally { setBusy(null); }
  };
  const verify = async () => {
    setError(null);
    if (!/^\d{4,8}$/.test(code.trim())) { setError(w('bad_code')); return; }
    setBusy('verify');
    try { await verifyCode(code.trim()); } catch { setError(w('bad_code')); } finally { setBusy(null); } // on success the app moves on by itself (AuthGate)
  };
  const tryNew = async () => {
    setError(null); setBusy('new');
    try { await startDemo(); } catch { setError(w('not_now')); } finally { setBusy(null); }
  };

  useAction(page, 'singpass', singpass);
  useAction(page, 'sendCode', () => { if (mode === 'ways') setMode('email'); else void send(); });
  useAction(page, 'tryNew', () => void tryNew());
  useField(page, 'email', email, (v) => { setMode((m) => (m === 'ways' ? 'email' : m)); setEmail(String(v ?? '').slice(0, 200)); });
  useField(page, 'code', code, (v) => setCode(String(v ?? '').replace(/\D/g, '').slice(0, 8)));

  const input = { minHeight: 60, fontSize: 19, color: colors.ink, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, outlineStyle: 'none' } as never;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, paddingBottom: 140 + insets.bottom, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <Pressable onPress={() => go('auth.who')} accessibilityRole="button" accessibilityLabel={w('o_back')}
          style={{ alignSelf: 'flex-start', minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 12, paddingRight: 18, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, marginBottom: space.md }}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} accessible={false} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{w('o_back')}</Text>
        </Pressable>
        <Collage />
        <View style={{ alignItems: 'center', marginTop: space.sm }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.muted }}>Interchange</Text>
          <Text accessibilityRole="header" style={{ fontSize: 36, lineHeight: 42, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: space.xs }}>{w('si_title')}</Text>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginTop: space.sm }]}>{w('si_sub')}</Text>
        </View>

        <View style={{ gap: space.sm, marginTop: space.xl }}>
          {mode === 'ways' ? (
            <>
              <El page={page} id="singpass"><Button dark label={w('singpass')} logo onPress={singpass} /></El>
              <El page={page} id="sendCode"><Button label={w('email')} icon="mail-outline" onPress={() => { setError(null); setMode('email'); }} /></El>
            </>
          ) : mode === 'email' ? (
            <>
              <El page={page} id="email">
                <TextInput value={email} onChangeText={setEmail} onSubmitEditing={() => void send()} autoFocus keyboardType="email-address" autoCapitalize="none" autoComplete="email"
                  placeholder={w('email_f')} placeholderTextColor={colors.muted} accessibilityLabel={w('email_f')} style={input} />
              </El>
              <El page={page} id="sendCode"><Button dark label={w('sendCode')} icon="mail-outline" busy={busy === 'send'} onPress={() => void send()} /></El>
              <Button label={w('o_back')} onPress={() => { setError(null); setMode('ways'); }} />
            </>
          ) : (
            <>
              <Text style={[type.body, { color: colors.ink }]}>{w('code_sent', { email: pendingEmail ?? email })}</Text>
              {devCode ? <Text style={{ fontSize: 17, fontWeight: '700', color: colors.muted }}>{w('dev_code', { code: devCode })}</Text> : null}
              <El page={page} id="code">
                <TextInput value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))} onSubmitEditing={() => void verify()} autoFocus keyboardType="number-pad" autoComplete="one-time-code"
                  placeholder={w('code')} placeholderTextColor={colors.muted} accessibilityLabel={w('code')} style={[input, { letterSpacing: 4 }] as never} />
              </El>
              <Button dark label={w('verify')} icon="log-in-outline" busy={busy === 'verify'} onPress={() => void verify()} />
              <Button label={w('o_back')} onPress={() => { setError(null); setCode(''); setMode('email'); }} />
            </>
          )}
          {error ? <Text accessibilityLiveRegion="polite" style={{ fontSize: 17, fontWeight: '700', color: colors.danger }}>{error}</Text> : null}
          {mode === 'ways' ? <El page={page} id="tryNew"><Button label={w('tryNew')} icon="person-add-outline" busy={busy === 'new'} onPress={() => void tryNew()} /></El> : null}
        </View>
        <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginTop: space.lg }]}>{w('terms')}</Text>
      </ScrollView>
    </View>
  );
}
