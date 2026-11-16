import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { type ActivityWhen, getActivities, getCommunity, setGoing } from '../../../api/communities';
import { El, usePageData, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { colors, space, type } from '../../../theme/tokens';
import { communityEvents as page } from '../pages';
import { Gate, JoinPill, ListRow, PillButton, Tabs, useLoad, useWhen } from '../ui';

// Events (sample 10, screen 3): three tabs and a Create Event button for community leaders.
export default function Events() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = String(id);
  const w = usePageWords(page);
  const go = useNavigate();
  const when = useWhen();
  const [tab, setTab] = useState<ActivityWhen>('upcoming');
  const { data, failed, reload } = useLoad(async () => {
    const [list, c] = await Promise.all([getActivities(cid, tab), getCommunity(cid)]);
    return { list, canManage: c.can_manage };
  }, `${cid}:${tab}`);

  const toggle = async (activityId: string, going: boolean) => {
    try {
      await setGoing(activityId, !going);
    } finally {
      reload();
    }
  };
  const tabs = [
    { key: 'upcoming' as const, label: w('upcoming') },
    { key: 'mine' as const, label: w('myEvents') },
    { key: 'past' as const, label: w('past') },
  ];
  const empty = tab === 'upcoming' ? w('noUpcoming') : tab === 'mine' ? w('noMine') : w('noPast');

  usePageData(
    page,
    data
      ? {
          values: [{ label: tabs.find((t) => t.key === tab)?.label ?? '', value: String(data.list.length) }],
          images: [],
          lists: [{ label: w('events'), items: data.list.map((a) => ({ label: a.title, detail: [when(a.starts_at), a.location].filter(Boolean).join(' · ') })) }],
          actions: [
            { id: 'upcoming', label: w('upcoming'), run: () => setTab('upcoming') },
            { id: 'myEvents', label: w('myEvents'), run: () => setTab('mine') },
            { id: 'past', label: w('past'), run: () => setTab('past') },
            ...(data.canManage ? [{ id: 'createEvent', label: w('createEvent'), run: () => { go('community.newEvent', { id: cid }); } }] : []),
          ],
        }
      : null
  );

  return (
    <Gate title={w('events')} data={data} failed={failed} reload={reload} notFound={w('notFound')} tryAgain={w('tryAgain')}>
      {(d) => (
        <>
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
          {d.list.length ? (
            d.list.map((a, i) => (
              <ListRow
                key={a.id}
                uri={a.image_url}
                icon="calendar"
                i={i}
                title={a.title}
                lines={[when(a.starts_at), a.location, a.repeat ? w(`repeat_${a.repeat}`) : null]}
                onPress={() => go('community.event', { id: cid, eid: a.id })}
                right={tab === 'past' ? undefined : <JoinPill on={a.i_going} label={a.i_going ? w('going') : w('join')} onPress={() => void toggle(a.id, a.i_going)} />}
              />
            ))
          ) : (
            <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginVertical: space.lg }]}>{empty}</Text>
          )}
          {d.canManage ? (
            <View style={{ alignItems: 'center' }}>
              <El page={page} id="createEvent"><PillButton label={w('createEvent')} onPress={() => go('community.newEvent', { id: cid })} /></El>
            </View>
          ) : null}
        </>
      )}
    </Gate>
  );
}
