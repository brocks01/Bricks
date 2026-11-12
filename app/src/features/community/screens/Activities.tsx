import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { getActivityCategories } from '../../../api/communities';
import { usePageData, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { colors, space, type } from '../../../theme/tokens';
import { communityActivities as page } from '../pages';
import { Gate, ListRow, Tabs, useLoad } from '../ui';

// Activities (sample 10, screen 5): the kinds of activity this community runs. Each opens the activities of that kind.
const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  fitness: 'body-outline', education: 'book-outline', environment: 'leaf-outline', cultural: 'color-palette-outline', arts: 'color-palette-outline', health: 'heart-outline',
};
const iconFor = (name: string) => {
  const k = Object.keys(ICONS).find((x) => name.toLowerCase().includes(x));
  return k ? ICONS[k] : 'layers-outline';
};

export default function Activities() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = String(id);
  const w = usePageWords(page);
  const go = useNavigate();
  const [tab, setTab] = useState<'all' | 'ongoing' | 'completed'>('all');
  const { data, failed, reload } = useLoad(() => getActivityCategories(cid), cid);
  const shown = (data ?? []).filter((c) => (tab === 'all' ? true : tab === 'ongoing' ? c.ongoing > 0 : c.completed > 0));

  usePageData(
    page,
    data
      ? {
          values: [],
          images: [],
          lists: [{ label: w('activities'), items: shown.map((c) => ({ label: c.name, detail: `${w('ongoing')}: ${c.ongoing} · ${w('completed')}: ${c.completed}` })) }],
          actions: [],
        }
      : null
  );

  return (
    <Gate title={w('activities')} data={data} failed={failed} reload={reload} notFound={w('notFound')} tryAgain={w('tryAgain')}>
      {() => (
        <>
          <Tabs tabs={[{ key: 'all', label: w('all') }, { key: 'ongoing', label: w('ongoing') }, { key: 'completed', label: w('completed') }]} value={tab} onChange={setTab} />
          {shown.length ? (
            shown.map((c, i) => (
              <ListRow
                key={c.name}
                uri={c.image_url}
                icon={iconFor(c.name)}
                i={i}
                title={c.name}
                lines={[`${w('ongoing')}: ${c.ongoing} · ${w('completed')}: ${c.completed}`]}
                onPress={() => go('community.category', { id: cid, name: c.name })}
              />
            ))
          ) : (
            <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginVertical: space.lg }]}>{w('noCategories')}</Text>
          )}
        </>
      )}
    </Gate>
  );
}
