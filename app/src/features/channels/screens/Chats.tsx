import { useFocusLive, useSavedState } from '../../../core/useFocusLive';
import { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { ApiError } from '../../../api/client';
import { disconnectTelegram, getChannels, makeLinkCode, type ChannelsStatus, type LinkCode } from '../../../api/wisdom';
import { Notice, Pill } from '../../../components/blocks';
import { Body, Button, Card, Screen } from '../../../components/ui';
import { El, useAction, usePageWords } from '../../../kit';
import { colors, space } from '../../../theme/tokens';
import { channelsChats as page } from '../pages';

type Kind = 'telegram' | 'whatsapp' | 'sms';
const KINDS: Kind[] = ['telegram', 'whatsapp', 'sms'];

export default function Chats() {
  const w = usePageWords(page);
  const [status, setStatus] = useSavedState<ChannelsStatus | null>('chats.status', null);
  const [code, setCode] = useState<(LinkCode & { kind: Kind }) | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(() => { getChannels().then(setStatus).catch(() => setNote(w('failed'))); }, [w]);
  useFocusLive(useCallback(() => { load(); }, [load]));

  const connect = async (kind: Kind) => {
    setNote(null);
    try {
      setCode({ ...(await makeLinkCode(kind)), kind });
    } catch (e) {
      setNote(e instanceof ApiError && e.status === 503 ? w('notAvailable') : w('failed'));
    }
  };
  useAction(page, 'telegram', () => connect('telegram'));
  useAction(page, 'whatsapp', () => connect('whatsapp'));
  useAction(page, 'sms', () => connect('sms'));

  return (
    <Screen title={w('heading')} subtitle={w('intro')} back>
      {note ? <Notice text={note} tone="warn" /> : null}
      {KINDS.map((k) => {
        const s = status?.[k];
        const available = !!s?.available;
        const connected = !!s?.connected;
        return (
          <El key={k} page={page} id={k}>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{w(k)}</Text>
                <Pill text={!available ? w('notAvailable') : connected ? w('connected') : w('notConnected')} tone={connected ? 'soft' : 'quiet'} />
              </View>
              {available ? (
                <Button kind={connected ? 'plain' : 'primary'} label={connected ? (k === 'telegram' ? w('disconnect') : w('connect')) : w('connect')}
                  onPress={() => (connected && k === 'telegram' ? disconnectTelegram().then(load).catch(() => setNote(w('failed'))) : connect(k))} />
              ) : null}
              {code?.kind === k ? (
                <View style={{ marginTop: space.md }}>
                  <Text style={{ fontSize: 14, color: colors.muted }}>{w('codeTitle')}</Text>
                  <Text selectable style={{ fontSize: 28, fontWeight: '800', letterSpacing: 3, color: colors.leaf, marginVertical: space.sm }}>{code.code}</Text>
                  <Body muted>{k === 'telegram' ? w('codeTelegram') : w('codeOther', { number: (k === 'whatsapp' ? status?.whatsapp.number : status?.sms.number) ?? '' })}</Body>
                  {k === 'telegram' && code.link ? <View style={{ marginTop: space.md }}><Button label={w('openTelegram')} icon="paper-plane-outline" onPress={() => { void Linking.openURL(code.link as string); }} /></View> : null}
                </View>
              ) : null}
            </Card>
          </El>
        );
      })}
      <Body muted>{w('phoneNote')}</Body>
    </Screen>
  );
}
