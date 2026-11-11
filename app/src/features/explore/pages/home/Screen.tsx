import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { getExploreHome, getExploreItems, type ExploreHome, type ExploreItem } from '../../../../api/explore';
import { SkeletonList } from '../../../../components/Skeleton';
import { Button, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { El, useField, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { ItemRow, SectionTitle, symbol } from '../../ui';
import { useToggleSave } from '../../useItems';
import { exploreHome as page } from './page';

// Explore home, as in ui-samples/11-grow-screens.webp (screen 2): a search box, six categories, picked for you, continue exploring.
// Everything comes from the database; nothing is hard-coded here except the words.
export default function ExploreHome() {
  const w = usePageWords(page);
  const navigate = useNavigate();
  const { status } = useStore(sessionStore);
  const [home, setHome] = useState<ExploreHome | null>(null);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState('');
  const [found, setFound] = useState<ExploreItem[] | null>(null);
  useField(page, 'search', q, (v) => setQ(String(v)));

  const load = useCallback(() => {
    setFailed(false);
    getExploreHome().then(setHome).catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (status === 'in') load();
  }, [status, load]);

  // Search as the person types, after a short pause.
  useEffect(() => {
    if (!q.trim()) {
      setFound(null);
      return;
    }
    const h = setTimeout(() => getExploreItems({ q }).then(setFound).catch(() => setFound([])), 300);
    return () => clearTimeout(h);
  }, [q]);

  const update = useCallback((fn: (i: ExploreItem) => ExploreItem) => {
    setHome((h) => (h ? { ...h, picked: h.picked.map(fn), continue: h.continue.map(fn) } : h));
    setFound((f) => (f ? f.map(fn) : f));
  }, []);
  const toggleSave = useToggleSave(update);

  const meta = (i: ExploreItem) => `${w('min', { n: i.minutes })} · ${w(i.format)}`;
  const open = (i: ExploreItem) => navigate('explore.item', { id: i.id });
  const list = found ?? null;
  const shownPicked = home?.picked ?? [];

  usePageData(
    page,
    home === null
      ? null
      : {
          values: [{ label: w('search'), value: q }],
          images: [],
          lists: [
            { label: w('categories'), items: home.categories.map((c) => ({ label: w(c.id), detail: `${w(c.id + '_line')} · ${c.items === 1 ? w('itemOne') : w('items', { n: c.items })}`, actions: [{ id: `category_${c.id}`, label: w(c.id), run: () => { navigate('explore.category', { id: c.id }); } }] })) },
            ...(list ? [{ label: w('search'), items: list.map((i, n) => ({ label: i.title, detail: meta(i), image: i.image_url ? { uri: i.image_url, alt: i.title } : undefined, actions: [{ id: `open${n + 1}`, label: i.title, run: () => open(i) }] })) }] : []),
            { label: home.has_interests ? w('picked') : w('pickedAll'), items: shownPicked.map((i, n) => ({ label: i.title, detail: `${meta(i)} · ${i.summary}`, image: i.image_url ? { uri: i.image_url, alt: i.title } : undefined, actions: [{ id: `pick${n + 1}`, label: i.title, run: () => open(i) }] })) },
            { label: w('continue'), items: home.continue.map((i, n) => ({ label: i.title, detail: i.completed ? w('done') : i.percent > 0 ? `${i.percent}%` : w('saved'), actions: [{ id: `continue${n + 1}`, label: i.title, run: () => open(i) }] })) },
          ],
          actions: [
            { id: 'interests', label: w('interests'), run: () => { navigate('explore.interests'); } },
            { id: 'mine', label: w('mine'), run: () => { navigate('explore.mine'); } },
          ],
        }
  );

  return (
    <Screen title={w('heading')} subtitle={w('intro')} back>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.button, paddingHorizontal: space.md, marginBottom: space.md }}>
        <Ionicons name="search-outline" size={20} color={colors.muted} style={{ marginRight: 10 }} />
        <El page={page} id="search">
          <View style={{ flex: 1 }}>
            <TextInput value={q} onChangeText={setQ} placeholder={w('search')} placeholderTextColor={colors.muted} accessibilityLabel={w('search')} autoCorrect={false} style={{ fontSize: 17, paddingVertical: 12, color: colors.ink }} />
          </View>
        </El>
      </View>

      {failed ? (
        <>
          <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('notFound')}</Text>
          <Button label={w('tryAgain')} onPress={load} />
        </>
      ) : home === null ? (
        <SkeletonList count={4} />
      ) : list ? (
        list.length ? list.map((i, n) => <ItemRow key={i.id} item={i} i={n} meta={meta(i)} onOpen={() => open(i)} onSave={() => void toggleSave(i)} saveLabel={i.saved ? w('unsave') : w('save')} />) : <Text style={[type.body, { color: colors.muted }]}>{w('noResults')}</Text>
      ) : (
        <>
          <El page={page} id="categories"><Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>{w('categories')}</Text></El>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {home.categories.map((c, n) => (
              <Pressable key={c.id} onPress={() => navigate('explore.category', { id: c.id })} accessibilityRole="button" style={{ width: '48.5%', borderRadius: radius.card, borderWidth: 1, borderColor: c.chosen ? colors.accent : colors.line, backgroundColor: colors.card, overflow: 'hidden' }}>
                {c.image_url ? <Image source={{ uri: c.image_url }} accessibilityIgnoresInvertColors style={{ width: '100%', height: 84 }} /> : (
                  <View style={{ height: 84, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={symbol(c.icon)} size={36} color={colors.accent} />
                  </View>
                )}
                <View style={{ padding: space.sm }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{w(c.id)}</Text>
                  <Text style={[type.small, { color: colors.muted }]} numberOfLines={2}>{w(c.id + '_line')}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <El page={page} id="picked"><SectionTitle>{home.has_interests ? w('picked') : w('pickedAll')}</SectionTitle></El>
          {shownPicked.map((i, n) => <ItemRow key={i.id} item={i} i={n} meta={meta(i)} onOpen={() => open(i)} onSave={() => void toggleSave(i)} saveLabel={i.saved ? w('unsave') : w('save')} />)}

          {home.continue.length ? (
            <>
              <El page={page} id="continue"><SectionTitle>{w('continue')}</SectionTitle></El>
              <Text style={[type.small, { color: colors.muted, marginBottom: space.sm }]}>{w('continueBody')}</Text>
              {home.continue.map((i, n) => <ItemRow key={i.id} item={i} i={n} meta={meta(i)} onOpen={() => open(i)} onSave={() => void toggleSave(i)} saveLabel={i.saved ? w('unsave') : w('save')} />)}
            </>
          ) : null}

          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
            <View style={{ flex: 1 }}><El page={page} id="interests"><Button label={w('interests')} onPress={() => navigate('explore.interests')} icon="heart-outline" /></El></View>
            <View style={{ flex: 1 }}><El page={page} id="mine"><Button label={w('mine')} onPress={() => navigate('explore.mine')} icon="compass-outline" /></El></View>
          </View>
        </>
      )}
    </Screen>
  );
}
