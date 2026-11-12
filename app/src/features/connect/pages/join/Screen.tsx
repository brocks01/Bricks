import { useState } from 'react';
import { Text } from 'react-native';
import { ApiError } from '../../../../api/client';
import { joinCommunity } from '../../../../api/communities';
import { Button, ErrorText, Field, Screen } from '../../../../components/ui';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { colors, space, type } from '../../../../theme/tokens';
import { connectJoin as page } from '../../pages';

// Join a community: the person types the code a leader gave them. The server answers with the community, which then opens.
export default function JoinCommunity() {
  const w = usePageWords(page);
  const go = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const join = async () => {
    const c = code.trim().toUpperCase();
    if (c.length < 4 || busy) return;
    setError(null);
    setBusy(true);
    try {
      const r = await joinCommunity(c);
      go('community.home', { id: r.id }, { replace: true });
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? w('codeBad') : w('failed'));
    } finally {
      setBusy(false);
    }
  };
  useField(page, 'code', code, (v) => setCode(String(v)));
  useAction(page, 'joinButton', join);
  useAction(page, 'goCreate', () => { go('connect.create'); });

  return (
    <Screen title={w('joinTitle')} subtitle={w('joinIntro')} back>
      <El page={page} id="code"><Field label={w('code')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} placeholder="ABCD-2345" autoCapitalize="none" maxLength={20} /></El>
      <ErrorText>{error}</ErrorText>
      <El page={page} id="joinButton"><Button label={w('joinButton')} onPress={() => void join()} disabled={busy || code.trim().length < 4} icon="enter-outline" /></El>
      <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginVertical: space.lg }]}>{w('orCreate')}</Text>
      <El page={page} id="goCreate"><Button label={w('goCreate')} onPress={() => go('connect.create')} kind="plain" icon="add" /></El>
    </Screen>
  );
}
