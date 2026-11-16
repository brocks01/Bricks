import { Text, View } from 'react-native';
import { Panel } from '../../components/blocks';
import { Button } from '../../components/ui';
import { colors, space, type } from '../../theme/tokens';

type W = (k: string, vars?: Record<string, string | number>) => string;

/**
 * Asked once, kindly, when a circle is for men only or women only and the person has not said yet. The answer is the person's own
 * declaration (never inferred, never shown outside the circle): it is saved with PUT /v1/onboarding/basics and the join is tried
 * again. "I'd rather not say" is accepted with no blame at all, and the circle simply stays closed to them for now.
 */
export function GenderAsk({ why, w, busy, onPick, onSkip }: { why: string; w: W; busy?: boolean; onPick: (g: 'man' | 'woman') => void; onSkip: () => void }) {
  return (
    <Panel tone="soft">
      <Text style={[type.h2, { color: colors.ink }]} accessibilityRole="header">{w('gender_ask')}</Text>
      <Text style={[type.body, { color: colors.ink, marginTop: space.xs }]}>{why}</Text>
      <View style={{ gap: space.sm, marginTop: space.md }}>
        <Button label={w('gender_man')} onPress={() => onPick('man')} disabled={busy} />
        <Button label={w('gender_woman')} onPress={() => onPick('woman')} disabled={busy} />
        <Button label={w('gender_skip')} kind="plain" onPress={onSkip} disabled={busy} />
      </View>
    </Panel>
  );
}
