import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Hero } from '../../../../components/Hero';
import { Screen } from '../../../../components/ui';
import { El, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { growHero } from '../../../explore/pics';
import { Glyph } from '../../../explore/ui';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { growIndex as page } from './page';

// The Grow home exactly as in ui-samples/11-grow-screens.webp (screen 1): a photo banner with the title, then six small cards,
// each a symbol and a title with its short line. Explore is built; the others say "Coming soon" when tapped. Nothing here is sample data.
type Card = 'health' | 'activity' | 'aspirations' | 'explore' | 'progress' | 'contributions';
const G = '#1B7F3B';
const CARDS: { id: Card; icon: string; lib: 'ion' | 'mci'; built: boolean }[] = [
  { id: 'health', icon: 'heart-pulse', lib: 'mci', built: false },
  { id: 'activity', icon: 'run', lib: 'mci', built: false },
  { id: 'aspirations', icon: 'flag-triangle', lib: 'mci', built: false },
  { id: 'explore', icon: 'compass-outline', lib: 'ion', built: true },
  { id: 'progress', icon: 'chart-bar', lib: 'mci', built: false },
  { id: 'contributions', icon: 'account-group', lib: 'mci', built: false },
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
    <Screen title={w('heading')} hero={<Hero source={growHero} title={w('heading')} subtitle={w('intro')} height={200} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {CARDS.map((c) => (
          <View key={c.id} style={{ width: '48.5%' }}>
            <El page={page} id={c.id}>
              <Pressable onPress={() => press(c)} accessibilityRole="button" style={{ minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.card, borderWidth: 1, borderColor: c.built ? '#BFE0C7' : colors.line, backgroundColor: c.built ? '#EEF8F0' : colors.card, padding: 10 }}>
                <Glyph icon={c.icon} lib={c.lib} color={G} tint="#E3F1E7" size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.ink }} numberOfLines={2}>{w(c.id)}</Text>
                  <Text style={{ fontSize: 12.5, lineHeight: 16, color: '#3B4A63' }} numberOfLines={2}>{w(c.id + '_line')}</Text>
                </View>
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
