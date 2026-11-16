import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { getSuggestions, type Suggestion } from '../../api/wisdom';
import { Button } from '../../components/ui';
import { useT } from '../../i18n';
import { useNavigate } from '../../navigation';
import { colors, radius, space, type } from '../../theme/tokens';

/** Personal suggestions from what the person enjoys: a group that already exists near them, or "five people near you enjoy this, start one". Shows nothing when there is nothing to say. */
export function SuggestionsCard() {
  const t = useT();
  const go = useNavigate();
  const [items, setItems] = useState<Suggestion[]>([]);
  useFocusEffect(useCallback(() => { getSuggestions().then((r) => setItems(r.suggestions)).catch(() => setItems([])); }, []));
  const w = (k: string, vars?: Record<string, string | number>) => t(`community.home.${k}`, vars);
  const joinable = items.flatMap((s) => s.groups.filter((g) => !g.joined && g.can_join).map((g) => ({ interest: s.interest, ...g }))).slice(0, 2);
  const starts = items.filter((s) => s.start_one).slice(0, 1);
  if (!joinable.length && !starts.length) return null;
  const box = { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.md, gap: space.sm } as const;
  return (
    <>
      {joinable.map((g) => (
        <View key={g.id} style={box}>
          <Text style={[type.small, { color: colors.muted }]}>{w('suggestJoin', { interest: g.interest })}</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{g.name}</Text>
          <Button kind="plain" label={w('suggestOpen')} onPress={() => go('community.home', { id: g.id })} />
        </View>
      ))}
      {starts.map((s) => (
        <View key={s.interest} style={box}>
          <Text style={[type.body, { color: colors.ink }]}>{w('suggestStart', { n: s.nearby_people, interest: s.interest })}</Text>
          <Button label={w('suggestCreate')} onPress={() => go('connect.create')} />
        </View>
      ))}
    </>
  );
}
