import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { closeHelp, getHelpInbox, sendHelp, type HelpAlert } from '../../../api/health';
import { ApiError } from '../../../api/client';
import { Empty, Notice, Panel, Section } from '../../../components/blocks';
import { Button, ErrorText, Field } from '../../../components/ui';
import { BackScreen } from '../../../components/BackButton';
import { useStore } from '../../../core/store';
import { El, useAction, useField, usePageData, usePageWords } from '../../../kit';
import { sessionStore } from '../../../session/store';
import { colors, space, type } from '../../../theme/tokens';
import { healthHelp as page } from '../pages';

// "Call for help" always comes first and is only ever done by the person: the app opens the phone's dialler, it never places an emergency call by itself.
const emergencyNumber = () => (-new Date().getTimezoneOffset() === 330 ? '112' : '995'); // India 112, otherwise Singapore 995
const callEmergency = () => Linking.openURL('tel:' + emergencyNumber()).catch(() => undefined);

export default function HelpScreen() {
  const w = usePageWords(page);
  const { status } = useStore(sessionStore);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<HelpAlert[]>([]);

  const load = useCallback(() => {
    getHelpInbox().then(setAlerts).catch(() => undefined);
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (status === 'in') load();
    }, [status, load])
  );

  const tell = useCallback(async () => {
    setError(null);
    try {
      const r = await sendHelp(message.trim() || undefined);
      setSent(r.family_told > 0 ? w('help_sent') : w('family_none'));
    } catch (e) {
      setError(e instanceof ApiError && e.code === 'already_sent' ? w('already_sent') : w('failed'));
    }
  }, [message, w]);

  const close = async (id: string) => {
    await closeHelp(id).catch(() => undefined);
    load();
  };

  useField(page, 'message', message, (v) => setMessage(String(v)));
  useAction(page, 'callEmergency', callEmergency);
  useAction(page, 'tellFamily', tell);
  usePageData(page, {
    values: [{ label: w('inbox_title'), value: String(alerts.length) }],
    images: [],
    lists: [],
    actions: [],
  });

  return (
    <BackScreen title={w('heading')}>
      <Text style={[type.body, { color: colors.ink, marginBottom: space.md }]}>{w('help_body')}</Text>
      <ErrorText>{error}</ErrorText>
      <View style={{ gap: space.md }}>
        <El page={page} id="callEmergency">
          <Button label={w('call_emergency')} kind="danger" icon="call-outline" onPress={callEmergency} />
        </El>
        <El page={page} id="message">
          <Field label={w('help_message')} value={message} onChangeText={setMessage} maxLength={300} />
        </El>
        <El page={page} id="tellFamily">
          <Button label={w('tell_family')} icon="people-outline" onPress={tell} />
        </El>
        {sent ? <Notice text={sent} /> : null}
      </View>

      <Section title={w('inbox_title')}>
        {alerts.length === 0 ? <Empty text={w('inbox_none')} /> : null}
        {alerts.map((a) => (
          <Panel key={a.id} tone="warn">
            <Text style={[type.h2, { color: colors.ink }]}>{w('needs_help', { name: a.from })}</Text>
            {a.message ? <Text style={[type.body, { color: colors.ink, marginVertical: space.xs }]}>{a.message}</Text> : null}
            <Button label={w('close_alert')} kind="plain" onPress={() => close(a.id)} />
          </Panel>
        ))}
      </Section>
    </BackScreen>
  );
}
