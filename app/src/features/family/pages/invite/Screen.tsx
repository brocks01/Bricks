import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { familyApi, type Invite } from '../../../../api/family';
import { Button, ChoiceChips, ErrorText, Field, Screen } from '../../../../components/ui';
import { useT } from '../../../../i18n';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { errorWords } from '../../../../session/errors';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { familyInvite as page } from './page';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FamilyInvite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = usePageWords(page);
  const t = useT();
  const go = useNavigate();
  const [contact, setContact] = useState('');
  const [role, setRole] = useState<string>('member');
  const [sent, setSent] = useState<Invite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!EMAIL.test(contact.trim())) return setError(w('contactError'));
    setError(null);
    setBusy(true);
    try {
      const invite = await familyApi.invite(String(id), contact.trim(), role as 'helper' | 'member');
      setSent(invite);
    } catch (e) {
      const m = errorWords(e);
      setError(m.key === 'common.error.generic' ? w('failed') : t(m.key, m.vars));
    } finally {
      setBusy(false);
    }
  };

  useField(page, 'contact', contact, (v) => setContact(String(v)));
  useField(page, 'role', role, (v) => setRole(String(v)));
  useAction(page, 'send', () => void send());

  return (
    <Screen title={w('heading')} back>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('intro')}</Text>

      {sent ? (
        <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.card, borderWidth: 1, borderColor: colors.accentLine, padding: space.md, marginBottom: space.md }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>{w('sentTitle')}</Text>
          {sent.dev_code ? <Text style={{ fontSize: 34, fontWeight: '900', letterSpacing: 6, color: colors.accent, textAlign: 'center', marginVertical: space.sm }}>{w('sentCode', { code: sent.dev_code })}</Text> : null}
          <Text style={[type.small, { color: colors.ink }]}>{sent.dev_code ? w('sentMail') : w('mailNote')}</Text>
          <Button label={w('done')} onPress={() => go('family.detail', { id: String(id) })} kind="plain" />
        </View>
      ) : (
        <>
          <El page={page} id="contact">
            <Field label={w('contact')} value={contact} onChangeText={setContact} placeholder={w('contactPlaceholder')} icon="mail-outline" keyboardType="email-address" autoCapitalize="none" />
          </El>
          <El page={page} id="role">
            <View>
              <Text style={[type.small, { color: colors.muted, marginBottom: space.xs }]}>{w('role')}</Text>
              <ChoiceChips
                label={w('role')}
                options={[
                  { value: 'member', label: w('roleMember') },
                  { value: 'helper', label: w('roleHelper') },
                ]}
                value={role}
                onChange={(v) => setRole(v)}
              />
            </View>
          </El>
          <ErrorText>{error}</ErrorText>
          <El page={page} id="send">
            <Button label={w('send')} onPress={() => void send()} disabled={busy} />
          </El>
        </>
      )}
    </Screen>
  );
}
