import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ApiError } from '../../../api/client';
import { endorseOffer, getConnectionMessages, sendConnectionMessage, type Connection, type WisdomMessage } from '../../../api/wisdom';
import { Empty, Notice, Panel } from '../../../components/blocks';
import { Body, Button, ErrorText, Field } from '../../../components/ui';
import { El, useAction, useField, usePageWords } from '../../../kit';
import { colors, space, type } from '../../../theme/tokens';
import { wisdomIndex as page } from '../pages';

/**
 * The first conversation of one accepted introduction: short messages, delivered by the outbox to the other side's preferred channel,
 * and (once a session has been logged) a thank-you for the offer. Phone numbers and emails are never part of it.
 * Only one of these is open at a time, so the page has one set of controls for the agent.
 */
export function Conversation({ c, onClose, onChanged }: { c: Connection; onClose: () => void; onChanged: () => void }) {
  const w = usePageWords(page);
  const [msgs, setMsgs] = useState<WisdomMessage[] | null>(null);
  const [text, setText] = useState('');
  const [thanks, setThanks] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getConnectionMessages(c.id)
      .then(setMsgs)
      .catch(() => { setMsgs([]); setError(w('failed')); });
  }, [c.id, w]);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    setError(null);
    if (!text.trim()) return;
    try {
      await sendConnectionMessage(c.id, text.trim());
      setText('');
      load();
      onChanged();
    } catch {
      setError(w('failed'));
    }
  };

  const thank = async () => {
    setError(null);
    if (!c.offer_id) return;
    try {
      await endorseOffer(c.offer_id, thanks.trim() || undefined);
      setNote(w('endorsed'));
      setThanks('');
      onChanged();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'needs_session') setNote(w('needsSession'));
      else if (e instanceof ApiError && e.code === 'already_endorsed') setNote(w('alreadyThanked'));
      else setError(w('failed'));
    }
  };

  useField(page, 'threadMessage', text, (v) => setText(String(v)));
  useAction(page, 'sendThread', send);
  useField(page, 'endorseNote', thanks, (v) => setThanks(String(v)));
  useAction(page, 'endorse', thank);

  const canThank = c.i_am === 'learner' && !!c.offer_id && c.sessions > 0 && !c.endorsed;

  return (
    <Panel>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[type.h2, { color: colors.ink }]}>{w('conversation')} · {c.with}</Text>
        <Button kind="plain" label={w('close')} onPress={onClose} />
      </View>
      <ErrorText>{error}</ErrorText>
      {note ? <Notice text={note} /> : null}
      <View style={{ marginTop: space.sm, gap: space.sm }}>
        {msgs === null ? null : msgs.length === 0 ? <Empty text={w('threadEmpty')} /> : msgs.map((m) => (
          <Panel key={m.id} tone={m.mine ? undefined : 'soft'}>
            <Text style={[type.small, { color: colors.muted }]}>{m.mine ? w('mine') : m.from}</Text>
            <Body>{m.body}</Body>
          </Panel>
        ))}
      </View>
      <View style={{ marginTop: space.sm }}>
        <El page={page} id="threadMessage"><Field label={w('messagePlaceholder')} value={text} onChangeText={setText} maxLength={500} /></El>
        <El page={page} id="sendThread"><Button label={w('send')} icon="paper-plane-outline" onPress={send} disabled={!text.trim()} /></El>
        <Text style={[type.small, { color: colors.muted, marginTop: space.xs }]}>{w('deliveryNote')}</Text>
      </View>

      {canThank ? (
        <View style={{ marginTop: space.md }}>
          <El page={page} id="endorseNote"><Field label={w('thankNote')} value={thanks} onChangeText={setThanks} maxLength={200} /></El>
          <El page={page} id="endorse"><Button kind="plain" label={w('thankYou')} icon="heart-outline" onPress={thank} /></El>
        </View>
      ) : null}
    </Panel>
  );
}
