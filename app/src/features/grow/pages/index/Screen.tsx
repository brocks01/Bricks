import { Pressable, Text, View } from 'react-native';
import { Hero } from '../../../../components/Hero';
import { Screen } from '../../../../components/ui';
import { El, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { growHero } from '../../../explore/pics';
import { Glyph } from '../../../explore/ui';
import { colors, radius, space } from '../../../../theme/tokens';
import { growIndex as page } from './page';

// The Grow home exactly as in ui-samples/11-grow-screens.webp (screen 1): a photo banner with the title, then six small cards,
// each a symbol and a title with its short line. Each card opens its own page. Nothing here is sample data.
type Card = 'health' | 'activity' | 'aspirations' | 'explore' | 'progress' | 'contributions';
const GO = { health: 'grow.health', activity: 'grow.activity', aspirations: 'grow.aspirations', explore: 'explore.home', progress: 'grow.progress', contributions: 'grow.contributions' } as const;
const G = '#B0502A';
const CARDS: { id: Card; icon: string; lib: 'ion' | 'mci' }[] = [
  { id: 'health', icon: 'heart-pulse', lib: 'mci' },
  { id: 'activity', icon: 'run', lib: 'mci' },
  { id: 'aspirations', icon: 'flag-triangle', lib: 'mci' },
  { id: 'explore', icon: 'compass-outline', lib: 'ion' },
  { id: 'progress', icon: 'chart-bar', lib: 'mci' },
  { id: 'contributions', icon: 'account-group', lib: 'mci' },
];

export default function GrowIndex() {
  const w = usePageWords(page);
  const navigate = useNavigate();
  const press = (c: (typeof CARDS)[number]) => {
    navigate(GO[c.id]);
  };

  usePageData(page, {
    values: [],
    images: [],
    lists: [],
    actions: CARDS.map((c) => ({ id: c.id, label: w(c.id), run: () => press(c) })),
  });

  return (
    <Screen title={w('heading')} hero={<Hero source={growHero} title={w('heading')} subtitle={w('intro')} height={150} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {CARDS.map((c) => (
          <View key={c.id} style={{ width: '48.5%' }}>
            <El page={page} id={c.id}>
              <Pressable onPress={() => press(c)} accessibilityRole="button" style={{ minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 8 }}>
                <Glyph icon={c.icon} lib={c.lib} color={G} tint="#E3F1E7" size={38} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.ink }} numberOfLines={2}>{w(c.id)}</Text>
                  <Text style={{ fontSize: 11.5, lineHeight: 15, color: '#3B4A63' }} numberOfLines={3}>{w(c.id + '_line')}</Text>
                  {c.id === 'health' ? <Text style={{ fontSize: 11, fontWeight: '800', color: G, marginTop: 2 }}>{w('soon')}</Text> : null}
                </View>
              </Pressable>
            </El>
          </View>
        ))}
      </View>
    </Screen>
  );
}
