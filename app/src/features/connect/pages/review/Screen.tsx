import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { decideRequest, getReviewQueue, type ReviewRequest } from '../../../../api/communityRules';
import { Empty, Panel } from '../../../../components/blocks';
import { Button, ErrorText, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { usePageData, usePageWords } from '../../../../kit';
import { sessionStore } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { connectReview as page } from '../../pages';

// For the Bricks team only. A person who is not on the team gets a plain "nothing here" (the server refuses the list).
export default function Review() {
  const w = usePageWords(page);
  const { status } = useStore(sessionStore);
  const [rows, setRows] = useState<ReviewRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getReviewQueue().then(setRows).catch(() => setRows([]));
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (status === 'in') load();
    }, [status, load])
  );

  const decide = async (r: ReviewRequest, approve: boolean) => {
    setError(null);
    try {
      await decideRequest(r.id, approve);
      load();
    } catch {
      setError(w('err_failed'));
    }
  };

  usePageData(
    page,
    rows === null
      ? null
      : {
          values: [],
          images: [],
          lists: [
            {
              label: w('heading'),
              items: rows.map((r, i) => ({
                label: r.name,
                detail: `${w('from_name', { name: r.by })}${r.area_name ? ' · ' + r.area_name : ''}`,
                actions: [
                  { id: `approve${i + 1}`, label: w('approve'), agent: 'human' as const, run: () => decide(r, true) },
                  { id: `decline${i + 1}`, label: w('decline'), agent: 'human' as const, run: () => decide(r, false) },
                ],
              })),
            },
          ],
          actions: [],
        }
  );

  return (
    <Screen back title={w('heading')}>
      <ErrorText>{error}</ErrorText>
      {rows && rows.length === 0 ? <Empty text={w('no_requests')} /> : null}
      {(rows ?? []).map((r) => (
        <Panel key={r.id}>
          <Text style={[type.h2, { color: colors.ink }]}>{r.name}</Text>
          <Text style={[type.small, { color: colors.muted, marginVertical: space.xs }]}>{w('from_name', { name: r.by })} · {w(`k_${r.kind}`)}{r.area_name ? ` · ${r.area_name}` : ''}</Text>
          {r.description ? <Text style={[type.body, { color: colors.ink }]}>{r.description}</Text> : null}
          {r.why ? <Text style={[type.body, { color: colors.ink, marginTop: space.xs }]}>{r.why}</Text> : null}
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
            <View style={{ flex: 1 }}><Button label={w('approve')} icon="checkmark" onPress={() => void decide(r, true)} /></View>
            <View style={{ flex: 1 }}><Button label={w('decline')} kind="plain" onPress={() => void decide(r, false)} /></View>
          </View>
        </Panel>
      ))}
    </Screen>
  );
}
