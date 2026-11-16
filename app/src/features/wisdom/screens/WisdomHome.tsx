// The Wisdom tab (revamp v2, A2): a LEARN | TEACH switch at the top, then one side.
// TEACH is the elder's own side (TeachHub); LEARN finds someone who can teach you (LearnHub). It opens on TEACH for someone who teaches
// (or has invitations waiting), else on LEARN; the person's own choice wins for as long as the tab is open.
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getConnections, getMyOffers } from '../../../api/wisdom';
import { Screen } from '../../../components/ui';
import { useStore } from '../../../core/store';
import { useT } from '../../../i18n';
import { El, usePageWords } from '../../../kit';
import type { PageDataAction } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { colors, radius, space } from '../../../theme/tokens';
import { wisdomIndex as page } from '../pages';
import { BLUE } from '../teachUi';
import { LearnHub } from './LearnHub';
import { TeachHub } from './TeachHub';

type Side = 'learn' | 'teach';

function Switch({ side, onChange }: { side: Side; onChange: (s: Side) => void }) {
  const t = useT();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm, marginBottom: space.lg }}>
      {(['learn', 'teach'] as Side[]).map((s) => {
        const on = side === s;
        return (
          <View key={s} style={{ flex: 1 }}>
            <El page={page} id={s === 'learn' ? 'learnTab' : 'teachTab'}>
              <Pressable onPress={() => onChange(s)} accessibilityRole="tab" accessibilityState={{ selected: on }}
                style={({ pressed }) => ({ minHeight: 60, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill,
                  borderWidth: 2, borderColor: BLUE, backgroundColor: on ? BLUE : colors.card, opacity: pressed ? 0.85 : 1 })}>
                <Ionicons name={s === 'teach' ? 'people' : 'book'} size={24} color={on ? colors.card : BLUE} accessible={false} />
                <Text style={{ fontSize: 19, fontWeight: '800', letterSpacing: 1, color: on ? colors.card : BLUE }}>{t(`wt.${s}`)}</Text>
              </Pressable>
            </El>
          </View>
        );
      })}
    </View>
  );
}

export default function WisdomHome() {
  const t = useT();
  const w = usePageWords(page);
  const go = useNavigate();
  const { status } = useStore(sessionStore);
  const [chosen, setChosen] = useState<Side | null>(null);
  const [guess, setGuess] = useState<Side | null>(null);

  useEffect(() => {
    if (status !== 'in') return;
    let live = true;
    Promise.all([getConnections(), getMyOffers()])
      .then(([c, o]) => { if (live) setGuess(c.some((x) => x.i_am === 'mentor' && x.waiting_for_me) || o.length ? 'teach' : 'learn'); })
      .catch(() => { if (live) setGuess('learn'); });
    return () => { live = false; };
  }, [status]);

  const side = chosen ?? guess;
  const sideActions: PageDataAction[] = [
    { id: 'learnTab', label: t('wt.learn'), run: () => setChosen('learn') },
    { id: 'teachTab', label: t('wt.teach'), run: () => setChosen('teach') },
  ];

  return (
    <Screen title="" hero={<Text accessibilityRole="header" style={{ fontSize: 30, fontWeight: '800', color: BLUE }}>{w('h_title')}</Text>}>
      {side ? <Switch side={side} onChange={setChosen} /> : null}
      {side === 'teach' ? <TeachHub extra={sideActions} /> : side === 'learn' ? <LearnHub extra={sideActions} /> : null}
      {side ? (
        <Pressable onPress={() => go('wisdom.more')} accessibilityRole="button" style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: space.lg }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.muted }}>{t('wt.more')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} accessible={false} />
        </Pressable>
      ) : null}
    </Screen>
  );
}
