import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { CommunityKind } from '../../api/communities';
import { colors, space } from '../../theme/tokens';
import '../lead/leadWords'; // registers the words

type T = (key: string, vars?: Record<string, string | number>) => string;
export interface RequestDraft { name: string; kind: CommunityKind; area: string; product: string; meeting: string }
const KINDS: CommunityKind[] = ['apartment', 'block', 'neighbourhood', 'club', 'other'];
const box = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 16 } as const;
const input = { minHeight: 50, fontSize: 17, color: colors.ink, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line } as const;

/**
 * Ask to start a community in four steps, like the owner's design: the kind, the name and place, what it is known for and when it meets, then a check and send.
 * It only collects the answers; sending (and the rules about who may ask) stay in the screen that holds it.
 */
export function RequestWizard({ w, t, busy, error, onSend }: { w: (k: string) => string; t: T; busy: boolean; error: string | null; onSend: (d: RequestDraft) => void }) {
  const [step, setStep] = useState(1);
  const [d, setD] = useState<RequestDraft>({ name: '', kind: 'neighbourhood', area: '', product: '', meeting: '' });
  const set = (patch: Partial<RequestDraft>) => setD((x) => ({ ...x, ...patch }));
  const blocked = step === 2 && d.name.trim().length < 2;
  const title = t(`lead.w${step}_title`);
  const hint = t(`lead.w${step}_hint`);
  const rows: [string, string][] = [
    [t('lead.r_type'), w(`k_${d.kind}`)],
    [w('r_name'), d.name.trim()],
    [t('lead.r_place'), d.area.trim() || '—'],
    [t('lead.r_product'), d.product.trim() || '—'],
    [t('lead.r_meets'), d.meeting.trim() || '—'],
  ];
  return (
    <View style={{ gap: 20, marginTop: space.md }}>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[1, 2, 3, 4].map((n) => <View key={n} style={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: n <= step ? colors.navy : '#EDE6DA' }} />)}
        </View>
        <Text style={{ fontSize: 15, fontWeight: '500', color: '#4A5361' }}>{t('lead.step_of', { n: step })}</Text>
        <Text style={{ fontSize: 25, lineHeight: 30, fontWeight: '600', color: colors.ink, letterSpacing: -0.3 }} accessibilityRole="header">{title}</Text>
        <Text style={{ fontSize: 16, color: '#4A5361' }}>{hint}</Text>
      </View>

      {step === 1 ? (
        <View style={{ gap: 10 }}>
          {KINDS.map((k) => (
            <Pressable key={k} onPress={() => set({ kind: k })} accessibilityRole="radio" accessibilityState={{ checked: d.kind === k }} style={{ minHeight: 64, borderRadius: 14, backgroundColor: colors.card, borderWidth: d.kind === k ? 2 : 1, borderColor: d.kind === k ? colors.navy : colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>{w(`k_${k}`)}</Text>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: d.kind === k ? 7 : 1, borderColor: d.kind === k ? colors.navy : '#CFC6B6' }} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {step === 2 ? (
        <View style={{ gap: 12 }}>
          <TextInput value={d.name} onChangeText={(v) => set({ name: v })} placeholder={w('r_name')} placeholderTextColor={colors.muted} accessibilityLabel={w('r_name')} maxLength={80} autoCapitalize="words" style={input} />
          <TextInput value={d.area} onChangeText={(v) => set({ area: v })} placeholder={w('r_area')} placeholderTextColor={colors.muted} accessibilityLabel={w('r_area')} maxLength={120} autoCapitalize="words" style={input} />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={{ gap: 12 }}>
          <TextInput value={d.product} onChangeText={(v) => set({ product: v })} placeholder={t('lead.f_product')} placeholderTextColor={colors.muted} accessibilityLabel={t('lead.f_product')} maxLength={80} style={input} />
          <TextInput value={d.meeting} onChangeText={(v) => set({ meeting: v })} placeholder={t('lead.f_meeting')} placeholderTextColor={colors.muted} accessibilityLabel={t('lead.f_meeting')} maxLength={200} style={input} />
        </View>
      ) : null}

      {step === 4 ? (
        <View style={box}>
          {rows.map(([k, v], i) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderColor: '#EDE6DA' }}>
              <Text style={{ color: '#4A5361', fontSize: 16 }}>{k}</Text>
              <Text style={{ flex: 1, fontWeight: '600', color: colors.ink, textAlign: 'right', fontSize: 16 }}>{v}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {error ? <Text style={{ fontSize: 15, color: colors.danger, fontWeight: '600' }}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable onPress={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} accessibilityRole="button" style={{ flex: 1, minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: '#CFC6B6', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', opacity: step === 1 ? 0.4 : 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.ink }}>{t('lead.back')}</Text>
        </Pressable>
        <Pressable onPress={() => (step < 4 ? !blocked && setStep((s) => s + 1) : !busy && onSend(d))} accessibilityRole="button" style={{ flex: 2, minHeight: 52, borderRadius: 12, backgroundColor: blocked || busy ? '#D9CFC0' : colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>{step < 4 ? t('lead.next') : w('send_req')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
