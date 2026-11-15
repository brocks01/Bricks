import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { castVote, closeVote, getRota, getVote, makeRota, rotaSignup, startVote, type RotaSlot, type Vote } from '../../api/lead';
import { colors, space } from '../../theme/tokens';
import './leadWords';

type T = (key: string, vars?: Record<string, string | number>) => string;
const box = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 16 } as const;
const LINE = '#EDE6DA';

const input = { minHeight: 46, fontSize: 16, color: colors.ink, backgroundColor: colors.bg, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line } as const;

function Btn({ label, onPress, kind = 'main', small }: { label: string; onPress: () => void; kind?: 'main' | 'navy' | 'plain'; small?: boolean }) {
  const bg = kind === 'main' ? colors.accent : kind === 'navy' ? colors.navy : '#FFFFFF';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ minHeight: small ? 42 : 50, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, borderWidth: kind === 'plain' ? 1 : 0, borderColor: '#CFC6B6' }}>
      <Text style={{ fontSize: small ? 15 : 16, fontWeight: '600', color: kind === 'plain' ? colors.ink : '#FFFFFF' }}>{label}</Text>
    </Pressable>
  );
}

/** The open vote: every member picks one idea; the Community Lead can close it, and the winner becomes the community's signature product. */
export function VoteCard({ cid, lead, t, onChanged }: { cid: string; lead: boolean; t: T; onChanged?: () => void }) {
  const [vote, setVote] = useState<Vote | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState(['', '']);
  const load = useCallback(() => {
    getVote(cid).then(setVote).catch(() => setVote(null));
  }, [cid]);
  useEffect(load, [load]);
  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch {
      setError(t('lead.failed'));
    }
    load();
    onChanged?.();
  };
  if (vote === undefined) return null;
  const filled = options.map((o) => o.trim()).filter(Boolean);
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink }} accessibilityRole="header">{t('lead.vote_title')}</Text>
      {error ? <Text style={{ fontSize: 14, color: colors.danger, fontWeight: '600' }}>{error}</Text> : null}
      {message ? <Text style={{ fontSize: 16, color: colors.ink, backgroundColor: colors.navySoft, borderRadius: 10, padding: 12 }}>{message}</Text> : null}
      {vote ? (
        <View style={[box, { paddingVertical: 14, gap: 10 }]}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>{vote.title}</Text>
          {vote.options.map((o) => {
            const share = vote.voters ? o.count / vote.voters : 0;
            return (
              <Pressable key={o.id} onPress={() => void run(() => castVote(vote.id, o.id))} accessibilityRole="radio" accessibilityState={{ checked: vote.my_pick === o.id }} style={{ gap: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 }}>
                  <Text style={{ fontSize: 16, fontWeight: vote.my_pick === o.id ? '700' : '500', color: colors.ink }}>{vote.my_pick === o.id ? '● ' : '○ '}{o.name}</Text>
                  <Text style={{ fontSize: 15, color: '#4A5361' }}>{o.count}</Text>
                </View>
                <View style={{ height: 6, borderRadius: 999, backgroundColor: '#EDE6DA', overflow: 'hidden' }}>
                  <View style={{ height: 6, borderRadius: 999, backgroundColor: colors.navy, width: `${Math.round(share * 100)}%` }} />
                </View>
              </Pressable>
            );
          })}
          <Text style={{ fontSize: 14, color: '#5A6472' }}>{t('lead.voters', { n: vote.voters, m: vote.members })}</Text>
          {lead ? <Btn label={t('lead.close_vote')} kind="navy" onPress={() => void run(async () => { const r = await closeVote(vote.id); setMessage(r.winner ? t('lead.winner', { name: r.winner }) : t('lead.tie')); })} /> : null}
        </View>
      ) : lead ? (
        <View style={[box, { paddingVertical: 14, gap: 10 }]}>
          <TextInput value={title} onChangeText={setTitle} placeholder={t('lead.vote_q_ph')} placeholderTextColor={colors.muted} accessibilityLabel={t('lead.vote_q_ph')} maxLength={120} style={input} />
          {options.map((o, i) => (
            <TextInput key={i} value={o} onChangeText={(v) => setOptions((l) => l.map((x, j) => (j === i ? v : x)))} placeholder={t('lead.option_ph')} placeholderTextColor={colors.muted} accessibilityLabel={`${t('lead.option_ph')} ${i + 1}`} maxLength={80} style={input} />
          ))}
          {options.length < 6 ? <Btn small kind="plain" label={t('lead.add_option')} onPress={() => setOptions((l) => [...l, ''])} /> : null}
          <Btn label={t('lead.start_vote')} onPress={() => { if (title.trim().length >= 2 && filled.length >= 2) void run(async () => { await startVote(cid, title.trim(), filled); setTitle(''); setOptions(['', '']); setMessage(null); }); }} />
        </View>
      ) : (
        <Text style={{ fontSize: 15, color: '#5A6472' }}>{message ?? ''}</Text>
      )}
    </View>
  );
}

/** The rota: a repeating shift as one slot a week. Members put their own name down; the Community Lead makes it and sees the gaps. */
export function RotaCard({ cid, lead, t, lang }: { cid: string; lead: boolean; t: T; lang: string }) {
  const [slots, setSlots] = useState<RotaSlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weekday, setWeekday] = useState(6);
  const [label, setLabel] = useState('');
  const load = useCallback(() => {
    getRota(cid).then(setSlots).catch(() => setSlots([]));
  }, [cid]);
  useEffect(load, [load]);
  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch {
      setError(t('lead.failed'));
    }
    load();
  };
  if (slots === null || (!slots.length && !lead)) return null;
  const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'short' });
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink }} accessibilityRole="header">{t('lead.rota_title')}</Text>
      {error ? <Text style={{ fontSize: 14, color: colors.danger, fontWeight: '600' }}>{error}</Text> : null}
      {slots.length ? (
        <View style={box}>
          {slots.map((s, i) => (
            <View key={s.id} style={{ paddingVertical: 14, borderBottomWidth: i < slots.length - 1 ? 1 : 0, borderColor: LINE, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.ink }}>{day(s.on)}{s.label ? ` · ${s.label}` : ''}</Text>
                  <Text style={{ fontSize: 15, color: '#4A5361' }}>{s.names.length ? s.names.join(', ') : '—'}</Text>
                </View>
                {s.mine ? (
                  <Btn small kind="plain" label={t('lead.take_name')} onPress={() => void run(() => rotaSignup(s.id, false))} />
                ) : s.gap > 0 ? (
                  <Btn small kind="navy" label={t('lead.put_name')} onPress={() => void run(() => rotaSignup(s.id, true))} />
                ) : (
                  <View style={{ backgroundColor: colors.navySoft, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 }}><Text style={{ fontSize: 13, fontWeight: '600', color: '#15202E' }}>{t('lead.full')}</Text></View>
                )}
              </View>
              {s.gap > 0 && lead ? <Text style={{ fontSize: 14, color: colors.accent, fontWeight: '600' }}>{s.gap === 1 ? t('lead.gap_one') : t('lead.gap_n', { n: s.gap })}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
      {slots.length ? <Text style={{ fontSize: 15, color: '#5A6472' }}>{t('lead.rota_help')}</Text> : null}
      {lead ? (
        <View style={[box, { paddingVertical: 14, gap: 10 }]}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{t('lead.rota_day')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {Array.from({ length: 7 }, (_, d) => (
              <Pressable key={d} onPress={() => setWeekday(d)} accessibilityRole="radio" accessibilityState={{ checked: weekday === d }} style={{ minHeight: 40, minWidth: 44, borderRadius: 10, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: weekday === d ? colors.navy : '#FFFFFF', borderWidth: 1, borderColor: colors.navy }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: weekday === d ? '#FFFFFF' : colors.navy }}>{new Date(2024, 0, 1 + d).toLocaleDateString(lang, { weekday: 'short' })}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={label} onChangeText={setLabel} placeholder={t('lead.rota_label_ph')} placeholderTextColor={colors.muted} accessibilityLabel={t('lead.rota_label_ph')} maxLength={80} style={input} />
          <Btn label={t('lead.rota_make')} onPress={() => void run(() => makeRota(cid, weekday, label.trim()))} />
        </View>
      ) : null}
    </View>
  );
}

export { Btn, box, LINE, input };
void space;
