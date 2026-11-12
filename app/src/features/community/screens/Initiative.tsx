import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { getInitiative, joinInitiative } from '../../../api/communities';
import { El, useAction, usePageData, usePageWords } from '../../../kit';
import { colors, radius, space, type } from '../../../theme/tokens';
import { symbol } from '../../explore/ui';
import { communityInitiative as page } from '../pages';
import { Banner, Gate, PillButton, useLoad } from '../ui';

// One initiative (sample 10, screen 10): what it is, members, the current plan, and Join / Leave.
export default function Initiative() {
  const { iid } = useLocalSearchParams<{ id: string; iid: string }>();
  const w = usePageWords(page);
  const { data, setData, failed, reload } = useLoad(() => getInitiative(String(iid)), String(iid));

  const toggle = async () => {
    if (!data) return;
    const was = data.joined;
    setData({ ...data, joined: !was, member_count: data.member_count + (was ? -1 : 1) });
    try {
      await joinInitiative(data.id, !was);
    } catch {
      setData(data);
    } finally {
      reload();
    }
  };
  useAction(page, 'joinInitiative', () => void toggle());
  usePageData(
    page,
    data
      ? {
          values: [
            { label: w('initiative'), value: data.title },
            { label: w('membersN', { n: data.member_count }), value: data.status === 'done' ? w('doneTag') : w('ongoingTag') },
            ...(data.current_plan ? [{ label: w('currentPlan'), value: data.current_plan }] : []),
          ],
          images: [],
          lists: [],
          actions: [],
        }
      : null
  );

  return (
    <Gate title={w('initiative')} data={data} failed={failed} reload={reload} notFound={w('notFound')} tryAgain={w('tryAgain')}>
      {(d) => (
        <>
          <Banner uri={d.image_url} icon={symbol(d.icon, 'leaf-outline')} />
          <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '800', color: colors.ink }}>{d.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginVertical: space.sm }}>
            <Ionicons name="people-outline" size={20} color={colors.accent} />
            <Text style={[type.small, { color: colors.muted }]}>{w('membersN', { n: d.member_count })} · {d.status === 'done' ? w('doneTag') : w('ongoingTag')}</Text>
          </View>
          {d.description ? <Text style={[type.body, { color: colors.ink }]}>{d.description}</Text> : null}
          {d.current_plan ? (
            <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.card, padding: space.md, marginTop: space.md }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: space.xs }}>{w('currentPlan')}</Text>
              <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
                <Ionicons name="leaf" size={18} color={colors.accent} />
                <Text style={[type.body, { color: colors.ink, flex: 1 }]}>{d.current_plan}</Text>
              </View>
            </View>
          ) : null}
          <El page={page} id="joinInitiative">
            <PillButton label={d.joined ? w('leaveInitiative') : w('joinInitiative')} icon={null} kind={d.joined ? 'outline' : 'primary'} onPress={() => void toggle()} />
          </El>
        </>
      )}
    </Gate>
  );
}
