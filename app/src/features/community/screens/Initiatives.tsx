import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { getCommunity, getInitiatives } from '../../../api/communities';
import { El, usePageData, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { colors, space, type } from '../../../theme/tokens';
import { symbol } from '../../explore/ui';
import { communityInitiatives as page } from '../pages';
import { Gate, ListRow, PillButton, useLoad } from '../ui';

// Initiatives (sample 10, screen 9): the long-running efforts of this community.
export default function Initiatives() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = String(id);
  const w = usePageWords(page);
  const go = useNavigate();
  const { data, failed, reload } = useLoad(async () => {
    const [list, c] = await Promise.all([getInitiatives(cid), getCommunity(cid)]);
    return { list, canManage: c.can_manage };
  }, cid);

  usePageData(
    page,
    data
      ? {
          values: [],
          images: [],
          lists: [{ label: w('initiatives'), items: data.list.map((i) => ({ label: i.title, detail: [i.summary, w('membersN', { n: i.member_count })].filter(Boolean).join(' · ') })) }],
          actions: data.canManage ? [{ id: 'startInitiative', label: w('startInitiative'), run: () => { go('community.newInitiative', { id: cid }); } }] : [],
        }
      : null
  );

  return (
    <Gate title={w('initiatives')} data={data} failed={failed} reload={reload} notFound={w('notFound')} tryAgain={w('tryAgain')}>
      {(d) => (
        <>
          {d.list.length ? (
            d.list.map((i, n) => (
              <ListRow key={i.id} icon={symbol(i.icon, 'leaf-outline')} i={n} title={i.title} lines={[i.summary]} onPress={() => go('community.initiative', { id: cid, iid: i.id })} />
            ))
          ) : (
            <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginVertical: space.lg }]}>{w('noInitiatives')}</Text>
          )}
          {d.canManage ? (
            <View style={{ alignItems: 'center' }}>
              <El page={page} id="startInitiative"><PillButton label={w('startInitiative')} onPress={() => go('community.newInitiative', { id: cid })} /></El>
            </View>
          ) : null}
        </>
      )}
    </Gate>
  );
}
