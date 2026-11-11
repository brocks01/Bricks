import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '../../../../components/ui';
import { El, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { growIndex as page } from './page';

// Six cards (sample 11, screen 1). Explore is built; the others say "Coming soon" when tapped. Nothing here is sample data.
type Card = 'health' | 'activity' | 'aspirations' | 'explore' | 'progress' | 'contributions';
const CARDS: { id: Card; icon: keyof typeof Ionicons.glyphMap; built: boolean }[] = [
  { id: 'health', icon: 'heart-outline', built: false },
  { id: 'activity', icon: 'walk-outline', built: false },
  { id: 'aspirations', icon: 'trail-sign-outline', built: false },
  { id: 'explore', icon: 'compass-outline', built: true },
  { id: 'progress', icon: 'stats-chart-outline', built: false },
  { id: 'contributions', icon: 'people-outline', built: false },
];

export default function GrowIndex() {
  const w = usePageWords(page);
  const navigate = useNavigate();
  const [soon, setSoon] = useState<Card | null>(null);
  const press = (c: (typeof CARDS)[number]) => {
    if (c.built) navigate('explore.home');
    else setSoon(c.id);
  };

  usePageData(page, {
    values: [],
    images: [],
    lists: [],
    actions: CARDS.map((c) => ({ id: c.id, label: c.built ? w(c.id) : `${w(c.id)} (${w('soon')})`, run: () => press(c) })),
  });

  return (
    <Screen title={w('heading')} subtitle={w('intro')}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {CARDS.map((c) => (
          <View key={c.id} style={{ width: '48.5%' }}>
            <El page={page} id={c.id}>
              <Pressable onPress={() => press(c)} accessibilityRole="button" style={{ minHeight: 132, borderRadius: radius.card, borderWidth: 1, borderColor: c.built ? colors.accentLine : colors.line, backgroundColor: c.built ? colors.accentSoft : colors.card, padding: space.md, gap: 6 }}>
                <Ionicons name={c.icon} size={30} color={colors.accent} />
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{w(c.id)}</Text>
                <Text style={[type.small, { color: colors.muted }]}>{w(c.id + '_line')}</Text>
              </Pressable>
            </El>
          </View>
        ))}
      </View>
      {soon ? (
        <El page={page} id="soon">
          <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginTop: space.lg }]}>{w(soon)}: {w('soon')}</Text>
        </El>
      ) : null}
    </Screen>
  );
}
