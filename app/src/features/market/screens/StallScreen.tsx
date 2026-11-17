import { useLocalSearchParams } from 'expo-router';
import { useLiveEpoch } from '../../../core/useFocusLive';
import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { cancelStall, getStalls, reserveStall, type StallSlot, type Stalls } from '../../../api/market';
import { Empty, ListRow, Notice, Section } from '../../../components/blocks';
import { Button, ChoiceChips, ErrorText, Field } from '../../../components/ui';
import { BackScreen } from '../../../components/BackButton';
import { useStore } from '../../../core/store';
import { useLanguage, useT } from '../../../i18n';
import '../../lead/leadWords'; // registers the words of the time slots
import { El, useAction, useField, usePageData, usePageWords } from '../../../kit';
import { sessionStore } from '../../../session/store';
import { colors, space, type } from '../../../theme/tokens';
import { marketStall as page } from '../pages';
import { refusalWord } from '../ui';

export default function StallScreen() {
  const w = usePageWords(page);
  const t = useT();
  const lang = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { status } = useStore(sessionStore);
  const [data, setData] = useState<Stalls | null>(null);
  const [lost, setLost] = useState(false);
  const [selling, setSelling] = useState('');
  const [helper, setHelper] = useState('');
  const [slot, setSlot] = useState<StallSlot>('whole');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (id) getStalls(id).then(setData).catch(() => setLost(true));
  }, [id]);
  const liveEpoch = useLiveEpoch();
  useEffect(() => {
    if (status === 'in') load();
  }, [status, load, liveEpoch]);

  const reserve = async () => {
    if (!id) return;
    setError(null);
    setMsg(null);
    try {
      await reserveStall(id, selling.trim(), helper.trim() || undefined, slot);
      setMsg(w('stall_reserved'));
      load();
    } catch (e) {
      setError(w(refusalWord(e)));
    }
  };
  const giveUp = async () => {
    if (!id) return;
    await cancelStall(id).catch(() => setError(w('failed')));
    setMsg(null);
    load();
  };

  useField(page, 'selling', selling, (v) => setSelling(String(v)));
  useField(page, 'helper', helper, (v) => setHelper(String(v)));
  useAction(page, 'reserve', reserve);
  useAction(page, 'giveUp', giveUp);
  usePageData(page, data === null ? null : { values: [{ label: w('stalls_title'), value: String(data.stalls.length) }], images: [], lists: [], actions: [] });

  if (lost) return <BackScreen title={w('heading')}><Empty text={w('not_found')} /></BackScreen>;
  const mine = data?.stalls.find((s) => s.mine);
  const when = data ? new Date(data.activity.starts_at).toLocaleString(lang, { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }) : '';

  return (
    <BackScreen title={data?.activity.title ?? w('heading')}>
      {data ? <Text style={[type.small, { color: colors.muted, marginBottom: space.md }]}>{when}</Text> : null}
      <ErrorText>{error}</ErrorText>
      {msg ? <Notice text={msg} /> : null}
      <Section title={w('stalls_title')}>
        {data && data.stalls.length === 0 ? <Empty text={w('no_stalls')} /> : null}
        {(data?.stalls ?? []).map((s, i) => (
          <ListRow key={s.id} icon="basket-outline" i={i} title={s.selling} sub={`${s.seller} · ${t(`lead.slot_${s.slot}`)}${s.helper_name ? ' · ' + w('helper_is', { name: s.helper_name }) : ''}`} />
        ))}
      </Section>
      {data && !data.activity.is_market ? <Notice tone="warn" text={w('err_not_market')} /> : null}
      {data?.activity.is_market ? (
        <Section title={w('reserve_title')}>
          {mine ? (
            <El page={page} id="giveUp"><Button label={w('cancel_stall')} kind="plain" onPress={giveUp} /></El>
          ) : (
            <>
              <El page={page} id="selling"><Field label={w('f_selling')} value={selling} onChangeText={setSelling} maxLength={200} /></El>
              <ChoiceChips label={t('lead.slot')} options={(['first', 'second', 'whole'] as StallSlot[]).map((v) => ({ value: v, label: t(`lead.slot_${v}`) }))} value={slot} onChange={(v) => setSlot(v as StallSlot)} />
              <El page={page} id="helper"><Field label={w('f_helper')} value={helper} onChangeText={setHelper} maxLength={60} /></El>
              <El page={page} id="reserve"><Button label={w('reserve_btn')} icon="checkmark" onPress={reserve} /></El>
            </>
          )}
        </Section>
      ) : null}
    </BackScreen>
  );
}
