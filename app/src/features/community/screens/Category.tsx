import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { getActivities, setGoing } from '../../../api/communities';
import { usePageData, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { colors, space, type } from '../../../theme/tokens';
import { communityCategory as page } from '../pages';
import { Gate, JoinPill, ListRow, useLoad, useWhen } from '../ui';

// One kind of activity (sample 10, screen 6): what is coming up of this kind, each with a Join button.
export default function Category() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const cid = String(id);
  const label = decodeURIComponent(String(name ?? ''));
  const w = usePageWords(page);
  const go = useNavigate();
  const when = useWhen();
  const { data, failed, reload } = useLoad(() => getActivities(cid, 'upcoming', label), `${cid}:${label}`);

  const toggle = async (activityId: string, going: boolean) => {
    try {
      await setGoing(activityId, !going);
    } finally {
      reload();
    }
  };
  usePageData(
    page,
    data ? { values: [{ label: w('activity'), value: label }], images: [], lists: [{ label: w('comingUp'), items: data.map((a) => ({ label: a.title, detail: when(a.starts_at) })) }], actions: [] } : null
  );

  return (
    <Gate title={label || w('activity')} data={data} failed={failed} reload={reload} notFound={w('notFound')} tryAgain={w('tryAgain')}>
      {(list) => (
        <>
          <Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>{w('comingUp')}</Text>
          {list.length ? (
            list.map((a, i) => (
              <ListRow
                key={a.id}
                uri={a.image_url}
                icon="calendar"
                i={i}
                title={a.title}
                lines={[when(a.starts_at), a.location]}
                onPress={() => go('community.event', { id: cid, eid: a.id })}
                right={<JoinPill on={a.i_going} label={a.i_going ? w('going') : w('join')} onPress={() => void toggle(a.id, a.i_going)} />}
              />
            ))
          ) : (
            <Text style={[type.body, { color: colors.muted }]}>{w('nothingHere')}</Text>
          )}
        </>
      )}
    </Gate>
  );
}
