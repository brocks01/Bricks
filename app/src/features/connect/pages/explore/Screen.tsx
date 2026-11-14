import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { ApiError } from '../../../../api/client';
import { exploreCommunities, joinOpenCommunity, leaveCommunity, type ExploreCommunity, type Limits } from '../../../../api/communityRules';
import { Empty, ListRow, Notice, Pill } from '../../../../components/blocks';
import { Button, ErrorText, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useT } from '../../../../i18n';
import { El, useField, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, size, space, type } from '../../../../theme/tokens';
import { connectExplore as page } from '../../pages';

export default function Explore() {
  const w = usePageWords(page);
  const t = useT();
  const navigate = useNavigate();
  const { status } = useStore(sessionStore);
  const [q, setQ] = useState('');
  const [list, setList] = useState<ExploreCommunity[] | null>(null);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(() => {
    exploreCommunities(q).then((r) => { setList(r.communities); setLimits(r.limits); }).catch(() => setError(w('err_failed')));
  }, [q, w]);
  useFocusEffect(
    useCallback(() => {
      if (status === 'in') load();
    }, [status, load])
  );

  const refuse = (e: unknown) => {
    const code = e instanceof ApiError ? e.code : '';
    setError(code === 'community_limit' ? w('err_limit') : code === 'invite_only' ? w('err_invite') : code === 'last_lead' ? w('err_last_lead') : w('err_failed'));
  };
  const join = async (c: ExploreCommunity) => {
    setError(null);
    setNote(null);
    try {
      await joinOpenCommunity(c.id);
      setNote(w('joined_ok', { name: c.name }));
      load();
    } catch (e) {
      refuse(e);
    }
  };
  const leave = async (c: ExploreCommunity) => {
    setError(null);
    setNote(null);
    try {
      await leaveCommunity(c.id);
      setNote(w('left_ok', { name: c.name }));
      load();
    } catch (e) {
      refuse(e);
    }
  };

  useField(page, 'search', q, (v) => setQ(String(v)));
  usePageData(
    page,
    list === null
      ? null
      : {
          values: [{ label: w('search'), value: q }, ...(limits ? [{ label: w('slots_used', { n: limits.used, max: limits.max }), value: '' }] : [])],
          images: [],
          lists: [
            {
              label: w('heading'),
              items: list.map((c, i) => ({
                label: c.name,
                detail: `${t('common.members', { n: c.member_count })}${c.family_here.length ? ' · ' + w('family_here_n', { n: c.family_here.length }) : ''}${c.joined ? ' · ' + w('joined_c') : ''}`,
                actions: [
                  ...(c.can_join ? [{ id: `join${i + 1}`, label: `${w('join_c')} ${c.name}`, agent: 'confirm' as const, run: () => join(c) }] : []),
                  ...(c.joined ? [{ id: `open${i + 1}`, label: c.name, run: () => { navigate('community.home', { id: c.id }); } }] : []),
                ],
              })),
            },
          ],
          actions: [],
        }
  );

  const full = !!limits && limits.left === 0;
  return (
    <Screen back title={w('heading')} subtitle={w('intro_explore')}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.button, paddingHorizontal: space.md, marginBottom: space.md }}>
        <Ionicons name="search-outline" size={size.icon.md} color={colors.muted} style={{ marginRight: space.sm }} />
        <El page={page} id="search">
          <View style={{ flex: 1 }}>
            <TextInput value={q} onChangeText={setQ} onSubmitEditing={load} placeholder={w('search_c')} placeholderTextColor={colors.muted} accessibilityLabel={w('search_c')} style={[{ minHeight: size.touch + space.sm, fontSize: 17, color: colors.ink }, { outlineStyle: 'none' } as object]} />
          </View>
        </El>
      </View>
      {limits ? <Text style={[type.small, { color: full ? colors.warn : colors.muted, fontWeight: '700', marginBottom: space.sm }]}>{w('slots_used', { n: limits.used, max: limits.max })}</Text> : null}
      {full ? <Notice tone="warn" text={w('full_note', { max: limits?.max ?? 3 })} /> : null}
      <ErrorText>{error}</ErrorText>
      {note ? <Notice text={note} /> : null}

      {list && list.length === 0 ? <Empty text={w('no_results')} /> : null}
      {(list ?? []).map((c, i) => (
        <ListRow
          key={c.id}
          icon="people-outline"
          i={i}
          title={c.name}
          sub={`${t('common.members', { n: c.member_count })}${c.area_name ? ' · ' + c.area_name : ''}${c.family_here.length ? ' · ' + w('family_here_n', { n: c.family_here.length }) : ''}`}
          onPress={c.joined ? () => navigate('community.home', { id: c.id }) : undefined}
          right={
            c.joined ? (
              <View style={{ alignItems: 'flex-end', gap: space.xs }}>
                <Pill text={w('joined_c')} />
                <Text accessibilityRole="button" onPress={() => void leave(c)} style={[type.small, { color: colors.danger, fontWeight: '700', paddingVertical: space.xs }]}>{w('leave_c')}</Text>
              </View>
            ) : c.can_join ? (
              <View style={{ minWidth: 88 }}><Button label={w('join_c')} onPress={() => void join(c)} /></View>
            ) : c.privacy === 'invite' ? (
              <View style={{ maxWidth: 140 }}><Text style={[type.small, { color: colors.muted }]}>{w('invite_only')}</Text></View>
            ) : null
          }
        />
      ))}
    </Screen>
  );
}
