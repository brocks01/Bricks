import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { CommunityKind } from '../../api/communities';
import type { Audience, Circle } from '../../api/communityRules';
import { colors, space } from '../../theme/tokens';
import '../lead/leadWords'; // registers the words

type T = (key: string, vars?: Record<string, string | number>) => string;
export interface RequestDraft { name: string; kind: CommunityKind; area: string; product: string; meeting: string; circle: Circle; audience: Audience }
const KINDS: CommunityKind[] = ['apartment', 'block', 'neighbourhood', 'club', 'other'];
const CIRCLES: Circle[] = ['origin', 'faith', 'place', 'life', 'interest'];
const AUDIENCES: Audience[] = ['all', 'men', 'women'];
const STEPS = 6; // kind, name and place, what it is known for, what brings you together, who it is for, check and send
const box = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 16 } as const;
const input = { minHeight: 50, fontSize: 17, color: colors.ink, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line } as const;

/** One round choice with a short line under it; the chosen one is ringed. */
function Choice({ on, label, line, onPress }: { on: boolean; label: string; line?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} style={{ minHeight: 64, borderRadius: 14, backgroundColor: colors.card, borderWidth: on ? 2 : 1, borderColor: on ? colors.navy : colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink }}>{label}</Text>
        {line ? <Text style={{ fontSize: 14, color: '#4A5361' }}>{line}</Text> : null}
      </View>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: on ? 7 : 1, borderColor: on ? colors.navy : '#CFC6B6' }} />
    </Pressable>
  );
}

/**
 * Ask to start a community in six steps, like the owner's design: the kind, the name and place, what it is known for and when it meets,
 * what brings the circle together, who it is for, then a check and send. The feeling and the audience are the circle's own
 * (see 02-product/communities.md); nobody is inferred anything here.
 * It only collects the answers; sending (and the rules about who may ask) stay in the screen that holds it.
 */
export function RequestWizard({ w, t, busy, error, onSend }: { w: (k: string, vars?: Record<string, string | number>) => string; t: T; busy: boolean; error: string | null; onSend: (d: RequestDraft) => void }) {
  const [step, setStep] = useState(1);
  const [d, setD] = useState<RequestDraft>({ name: '', kind: 'neighbourhood', area: '', product: '', meeting: '', circle: 'life', audience: 'all' });
  const set = (patch: Partial<RequestDraft>) => setD((x) => ({ ...x, ...patch }));
  const blocked = step === 2 && d.name.trim().length < 2;
  // steps 1-3 keep the lead's words; 4 and 5 are this wizard's own; the check is the lead's step 4.
  const title = step === 4 ? w('circle_ask') : step === 5 ? w('audience_ask') : t(`lead.w${step === STEPS ? 4 : step}_title`);
  const hint = step === 4 ? w('circle_hint') : step === 5 ? w('audience_why') : t(`lead.w${step === STEPS ? 4 : step}_hint`);
  const rows: [string, string][] = [
    [t('lead.r_type'), w(`k_${d.kind}`)],
    [w('r_name'), d.name.trim()],
    [t('lead.r_place'), d.area.trim() || '—'],
    [w('circle_ask'), w(`circle_${d.circle}`)],
    [w('audience_ask'), w(`audience_${d.audience}`)],
    [t('lead.r_product'), d.product.trim() || '—'],
    [t('lead.r_meets'), d.meeting.trim() || '—'],
  ];
  return (
    <View style={{ gap: 20, marginTop: space.md }}>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Array.from({ length: STEPS }, (_, i) => i + 1).map((n) => <View key={n} style={{ flex: 1, height: 4, borderRadius: 999, backgroundColor: n <= step ? colors.navy : '#EDE6DA' }} />)}
        </View>
        <Text style={{ fontSize: 15, fontWeight: '500', color: '#4A5361' }}>{w('step_of', { n: step })}</Text>
        <Text style={{ fontSize: 25, lineHeight: 30, fontWeight: '600', color: colors.ink, letterSpacing: -0.3 }} accessibilityRole="header">{title}</Text>
        <Text style={{ fontSize: 16, color: '#4A5361' }}>{hint}</Text>
      </View>

      {step === 1 ? (
        <View style={{ gap: 10 }}>
          {KINDS.map((k) => <Choice key={k} on={d.kind === k} label={w(`k_${k}`)} onPress={() => set({ kind: k })} />)}
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
        <View style={{ gap: 10 }}>
          {CIRCLES.map((c) => <Choice key={c} on={d.circle === c} label={w(`circle_${c}`)} line={w(`ex_${c}`)} onPress={() => set({ circle: c })} />)}
        </View>
      ) : null}

      {step === 5 ? (
        <View style={{ gap: 10 }}>
          {AUDIENCES.map((a) => <Choice key={a} on={d.audience === a} label={w(`audience_${a}`)} onPress={() => set({ audience: a })} />)}
        </View>
      ) : null}

      {step === STEPS ? (
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
        <Pressable onPress={() => (step < STEPS ? !blocked && setStep((s) => s + 1) : !busy && onSend(d))} accessibilityRole="button" style={{ flex: 2, minHeight: 52, borderRadius: 12, backgroundColor: blocked || busy ? '#D9CFC0' : colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>{step < STEPS ? t('lead.next') : w('send_req')}</Text>
        </Pressable>
      </View>
    </View>
  );
}
