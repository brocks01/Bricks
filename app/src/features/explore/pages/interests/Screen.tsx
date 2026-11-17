import { Ionicons } from '@expo/vector-icons';
import { useLiveEpoch } from '../../../../core/useFocusLive';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getExploreInterests, putExploreInterests, type ExploreCategoryId } from '../../../../api/explore';
import { SkeletonList } from '../../../../components/Skeleton';
import { BackScreen } from '../../../../components/BackButton';
import { Button } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { El, usePageData, usePageWords } from '../../../../kit';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { exploreInterests as page } from './page';

const ALL: ExploreCategoryId[] = ['digital_skills', 'health_awareness', 'everyday_life', 'hobbies', 'culture', 'knowledge'];

// My Interests (sample 9): tick what you would like to see more of, then save. Choosing nothing is fine; Explore then shows everything.
export default function ExploreInterests() {
  const w = usePageWords(page);
  const { status } = useStore(sessionStore);
  const [chosen, setChosen] = useState<ExploreCategoryId[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const liveEpoch = useLiveEpoch();
  useEffect(() => {
    if (status === 'in') getExploreInterests().then(setChosen).catch(() => setChosen([]));
  }, [status, liveEpoch]);
  const toggle = useCallback((id: ExploreCategoryId) => {
    setSaved(false);
    setChosen((c) => (c ? (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]) : c));
  }, []);
  const save = useCallback(async () => {
    if (!chosen || busy) return;
    setBusy(true);
    try {
      await putExploreInterests(chosen);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }, [chosen, busy]);

  usePageData(
    page,
    chosen === null
      ? null
      : {
          values: [{ label: w('chosen'), value: chosen.map((c) => w(c)).join(', ') }],
          images: [],
          lists: [{ label: w('interestsQ'), items: ALL.map((id, n) => ({ label: w(id), detail: chosen.includes(id) ? w('saved') : undefined, actions: [{ id: `toggle${n + 1}`, label: w(id), run: () => toggle(id) }] })) }],
          actions: [{ id: 'saveInterests', label: w('saveInterests'), run: () => save() }],
        }
  );

  return (
    <BackScreen title={w('interests')} subtitle={w('interestsQ')}>
      {chosen === null ? (
        <SkeletonList count={4} />
      ) : (
        <>
          {ALL.map((id) => {
            const on = chosen.includes(id);
            return (
              <Pressable key={id} onPress={() => toggle(id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: on ? colors.accent : colors.line, padding: space.md, marginBottom: space.sm }}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={26} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{w(id)}</Text>
                  <Text style={[type.small, { color: colors.muted }]}>{w(id + '_line')}</Text>
                </View>
              </Pressable>
            );
          })}
          <View style={{ marginTop: space.md }}>
            <El page={page} id="saveInterests"><Button label={w('saveInterests')} onPress={() => void save()} icon="checkmark" /></El>
          </View>
          {saved ? <Text style={[type.small, { color: colors.accent, textAlign: 'center', marginTop: space.sm }]}>{w('interestsSaved')}</Text> : null}
        </>
      )}
    </BackScreen>
  );
}
