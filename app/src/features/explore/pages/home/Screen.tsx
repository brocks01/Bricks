import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getExploreHome, type ExploreHome } from '../../../../api/explore';
import { Hero } from '../../../../components/Hero';
import { SkeletonList } from '../../../../components/Skeleton';
import { Button, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { El, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { categoryLook, exploreHero } from '../../pics';
import { Glyph } from '../../ui';
import { exploreHome as page } from './page';

// Explore home exactly as in ui-samples/11-grow-screens.webp (screen 2): a green heading, one line, a photo, six category cards (symbol, name, short line).
// The categories and their item counts come from the database; nothing else is on this screen except the two small links to My interests and My exploration.
export default function ExploreHome() {
  const w = usePageWords(page);
  const navigate = useNavigate();
  const { status } = useStore(sessionStore);
  const [home, setHome] = useState<ExploreHome | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getExploreHome().then(setHome).catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (status === 'in') load();
  }, [status, load]);

  usePageData(
    page,
    home === null
      ? null
      : {
          values: [{ label: w('heading'), value: w('intro') }],
          images: [{ uri: 'explore-banner', alt: w('intro2') }],
          lists: [{ label: w('categories'), items: home.categories.map((c) => ({ label: w(c.id), detail: `${w(c.id + '_line')} · ${c.items === 1 ? w('itemOne') : w('items', { n: c.items })}`, actions: [{ id: `category_${c.id}`, label: w(c.id), run: () => { navigate('explore.category', { id: c.id }); } }] })) }],
          actions: [
            { id: 'interests', label: w('interests'), run: () => { navigate('explore.interests'); } },
            { id: 'mine', label: w('mine'), run: () => { navigate('explore.mine'); } },
          ],
        }
  );

  return (
    <Screen title={w('heading')} back>
      <El page={page} id="heading">
        <Text style={{ fontSize: 28, lineHeight: 33, fontWeight: '800', color: '#12691F' }}>{w('intro')}</Text>
      </El>
      <Text style={{ fontSize: 15, lineHeight: 21, color: '#1F2A44', marginTop: space.sm, marginBottom: space.md }}>{w('intro2')}</Text>
      <Hero source={exploreHero} height={150} light={false} />

      {failed ? (
        <>
          <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('notFound')}</Text>
          <Button label={w('tryAgain')} onPress={load} />
        </>
      ) : home === null ? (
        <SkeletonList count={3} />
      ) : (
        <>
          <El page={page} id="categories">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {home.categories.map((c) => {
                const look = categoryLook[c.id];
                return (
                  <View key={c.id} style={{ width: '48.5%' }}>
                    <Pressable onPress={() => navigate('explore.category', { id: c.id })} accessibilityRole="button" style={{ minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 10 }}>
                      <Glyph icon={look.icon} lib={look.lib} color={look.color} tint={look.tint} size={44} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14.5, fontWeight: '800', color: colors.ink }} numberOfLines={2}>{w(c.id)}</Text>
                        <Text style={{ fontSize: 12.5, lineHeight: 16, color: '#3B4A63' }} numberOfLines={2}>{w(c.id + '_line')}</Text>
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </El>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: space.lg }}>
            <El page={page} id="interests"><Pressable onPress={() => navigate('explore.interests')} accessibilityRole="link" hitSlop={8}><Text style={{ fontSize: 15, fontWeight: '700', color: colors.accent }}>{w('interests')}</Text></Pressable></El>
            <El page={page} id="mine"><Pressable onPress={() => navigate('explore.mine')} accessibilityRole="link" hitSlop={8}><Text style={{ fontSize: 15, fontWeight: '700', color: colors.accent }}>{w('mine')}</Text></Pressable></El>
          </View>
        </>
      )}
    </Screen>
  );
}
