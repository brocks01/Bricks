import { useLocalSearchParams } from 'expo-router';
import { Share, Text } from 'react-native';
import { getActivity, setGoing } from '../../../api/communities';
import { El, useAction, usePageData, usePageWords } from '../../../kit';
import { colors, space, type } from '../../../theme/tokens';
import { communityEvent as page } from '../pages';
import { Banner, Fact, Gate, PillButton, useLoad, useWhen } from '../ui';

// One event (sample 10, screen 4): picture, when, where, how many are going, the description, and Join / Share.
export default function Event() {
  const { eid } = useLocalSearchParams<{ id: string; eid: string }>();
  const w = usePageWords(page);
  const when = useWhen();
  const { data, setData, failed, reload } = useLoad(() => getActivity(String(eid)), String(eid));

  const toggle = async () => {
    if (!data) return;
    const was = data.i_going;
    setData({ ...data, i_going: !was, going_count: data.going_count + (was ? -1 : 1) }); // shown at once, undone if the server refuses
    try {
      await setGoing(data.id, !was);
    } catch {
      setData(data);
    } finally {
      reload();
    }
  };
  const share = () => {
    if (!data) return;
    void Share.share({ message: w('shareEvent', { title: data.title, when: when(data.starts_at), where: data.location ?? '' }) });
  };
  useAction(page, 'joinEvent', () => void toggle());
  useAction(page, 'share', share);
  usePageData(
    page,
    data
      ? {
          values: [
            { label: w('event'), value: data.title },
            { label: w('joinEvent'), value: when(data.starts_at) },
            { label: w('goingCount', { n: data.going_count }), value: data.location ?? '' },
          ],
          images: data.image_url ? [{ uri: data.image_url, alt: data.title }] : [],
          lists: [],
          actions: [],
        }
      : null
  );

  return (
    <Gate title={w('event')} data={data} failed={failed} reload={reload} notFound={w('notFound')} tryAgain={w('tryAgain')}>
      {(d) => {
        const full = !!d.capacity && d.going_count >= d.capacity && !d.i_going;
        return (
          <>
            <Banner uri={d.image_url} icon="calendar" />
            <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: space.md }}>{d.title}</Text>
            <Fact icon="calendar-outline" text={when(d.starts_at)} />
            {d.location ? <Fact icon="location-outline" text={d.location} /> : null}
            <Fact icon="people-outline" text={w('goingCount', { n: d.going_count })} />
            {d.organiser ? <Text style={[type.small, { color: colors.muted, marginBottom: space.sm }]}>{w('by', { name: d.organiser })}</Text> : null}
            {d.description ? <Text style={[type.body, { color: colors.ink, marginTop: space.sm }]}>{d.description}</Text> : null}
            {full ? <Text style={[type.small, { color: colors.danger, fontWeight: '700', marginTop: space.sm }]}>{w('full')}</Text> : null}
            <El page={page} id="joinEvent">
              <PillButton label={d.i_going ? w('leaveEvent') : w('joinEvent')} icon={null} kind={d.i_going ? 'outline' : 'primary'} disabled={full} onPress={() => void toggle()} />
            </El>
            <El page={page} id="share">
              <PillButton label={w('share')} icon="share-outline" kind="outline" onPress={share} />
            </El>
          </>
        );
      }}
    </Gate>
  );
}
