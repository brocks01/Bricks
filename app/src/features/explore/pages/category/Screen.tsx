import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { getExploreItems, type ExploreItem } from '../../../../api/explore';
import { Hero } from '../../../../components/Hero';
import { SkeletonList } from '../../../../components/Skeleton';
import { Button, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { El, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { categoryPic } from '../../pics';
import { ItemRow } from '../../ui';
import { useToggleSave } from '../../useItems';
import { exploreCategory as page } from './page';

// One category with all its items (sample screen 3).
export default function ExploreCategory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = usePageWords(page);
  const navigate = useNavigate();
  const { status } = useStore(sessionStore);
  const [items, setItems] = useState<ExploreItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    getExploreItems({ category: String(id) })
      .then((x) => {
        setFailed(false);
        setItems(x);
      })
      .catch(() => setFailed(true));
  }, [id]);
  useEffect(() => {
    if (status === 'in' && id) load();
  }, [status, id, load]);
  const update = useCallback((fn: (i: ExploreItem) => ExploreItem) => setItems((l) => (l ? l.map(fn) : l)), []);
  const toggleSave = useToggleSave(update);
  const meta = (i: ExploreItem) => `${w('min', { n: i.minutes })} · ${w(i.format)} · ${w(i.level)}`;
  const name = w(String(id));

  usePageData(
    page,
    items === null
      ? null
      : {
          values: [{ label: w('heading'), value: name }],
          images: [],
          lists: [{ label: name, items: items.map((i, n) => ({ label: i.title, detail: `${meta(i)} · ${i.summary}`, image: i.image_url ? { uri: i.image_url, alt: i.title } : undefined, actions: [{ id: `open${n + 1}`, label: i.title, run: () => { navigate('explore.item', { id: i.id }); } }] })) }],
          actions: [],
        }
  );

  return (
    <Screen title={name} back>
      <El page={page} id="heading">
        <Hero source={categoryPic[id as keyof typeof categoryPic] ?? categoryPic.digital_skills} title={name} subtitle={w(String(id) + '_line')} height={130} light />
      </El>
      {String(id) === 'health_awareness' ? <Text style={[type.small, { color: colors.warn, backgroundColor: colors.warnSoft, padding: space.sm, borderRadius: 10, marginBottom: space.md }]}>{w('notAdvice')}</Text> : null}
      {failed ? (
        <>
          <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('notFound')}</Text>
          <Button label={w('tryAgain')} onPress={load} />
        </>
      ) : items === null ? (
        <SkeletonList count={4} />
      ) : (
        items.map((i, n) => <ItemRow key={i.id} item={i} i={n} meta={meta(i)} onOpen={() => navigate('explore.item', { id: i.id })} onSave={() => void toggleSave(i)} saveLabel={i.saved ? w('unsave') : w('save')} />)
      )}
    </Screen>
  );
}
