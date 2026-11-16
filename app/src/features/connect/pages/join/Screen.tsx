import { useState } from 'react';
import { Text } from 'react-native';
import { ApiError } from '../../../../api/client';
import { joinCommunity } from '../../../../api/communities';
import { putOnboarding } from '../../../../api/wisdom';
import { Notice } from '../../../../components/blocks';
import { Button, ErrorText, Field, Screen } from '../../../../components/ui';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { colors, space, type } from '../../../../theme/tokens';
import { GenderAsk } from '../../GenderAsk';
import { connectJoin as page } from '../../pages';

// Join a community: the person types the code a leader gave them. The server answers with the community, which then opens.
// A circle for men only or women only asks once for the person's own answer (GenderAsk), saves it, and tries again.
export default function JoinCommunity() {
  const w = usePageWords(page);
  const go = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const [answering, setAnswering] = useState(false);

  const join = async (g?: 'man' | 'woman') => {
    const c = code.trim().toUpperCase();
    if (c.length < 4 || busy || answering) return;
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      if (g) await putOnboarding('basics', { gender: g }); // their own answer, saved once
      const r = await joinCommunity(c);
      go('community.home', { id: r.id }, { replace: true });
    } catch (e) {
      const errCode = e instanceof ApiError ? e.code : '';
      if (errCode === 'gender_needed') setAsk(true); // we do not know this circle's audience, so the question is the neutral one
      else {
        setAsk(false);
        setError(
          e instanceof ApiError && e.status === 404 ? w('codeBad')
            : errCode === 'community_limit' ? w('err_limit')
              // never blaming: the circle is for a group of people, and there are open ones for everyone
              : errCode === 'audience_men' ? w('err_aud_men')
                : errCode === 'audience_women' ? w('err_aud_women')
                  : w('failed'));
      }
    } finally {
      setBusy(false);
    }
  };
  const answer = async (g: 'man' | 'woman') => {
    setAnswering(true);
    await join(g);
    setAnswering(false);
  };
  const skipAsk = () => {
    setAsk(false);
    setError(null);
    setNote(w('gender_declined'));
  };

  useField(page, 'code', code, (v) => setCode(String(v)));
  useAction(page, 'joinButton', () => join());
  useAction(page, 'goCreate', () => { go('connect.create'); });

  return (
    <Screen title={w('joinTitle')} subtitle={w('joinIntro')} back>
      <El page={page} id="code"><Field label={w('code')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} placeholder="ABCD-2345" autoCapitalize="none" maxLength={20} /></El>
      <ErrorText>{error}</ErrorText>
      {note ? <Notice text={note} /> : null}
      {ask ? <GenderAsk why={w('gender_why_any')} w={w} busy={answering || busy} onPick={(g) => void answer(g)} onSkip={skipAsk} /> : null}
      <El page={page} id="joinButton"><Button label={w('joinButton')} onPress={() => void join()} disabled={busy || answering || code.trim().length < 4} icon="enter-outline" /></El>
      <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginVertical: space.lg }]}>{w('orCreate')}</Text>
      <El page={page} id="goCreate"><Button label={w('goCreate')} onPress={() => go('connect.create')} kind="plain" icon="add" /></El>
    </Screen>
  );
}
