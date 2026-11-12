import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { getMembers } from '../../../api/communities';
import { El, useAction, useField, usePageData, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { useStore } from '../../../core/store';
import { colors, radius, space, type } from '../../../theme/tokens';
import { communityPeople as page } from '../pages';
import { Gate, ListRow, PillButton, useLoad } from '../ui';

// People (sample 10, screen 7): the members, a search box, and Invite Member.
export default function People() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = String(id);
  const w = usePageWords(page);
  const go = useNavigate();
  const { user } = useStore(sessionStore);
  const [q, setQ] = useState('');
  const { data, failed, reload } = useLoad(() => getMembers(cid, q), `${cid}:${q}`);
  const invite = () => go('community.invite', { id: cid });

  useField(page, 'searchMembers', q, (v) => setQ(String(v)));
  useAction(page, 'inviteMember', invite);
  usePageData(page, data ? { values: [], images: [], lists: [{ label: w('members'), items: data.map((m) => ({ label: m.name, detail: m.role })) }], actions: [] } : null);

  return (
    <Gate title={w('people')} data={data} failed={failed} reload={reload} notFound={w('notFound')} tryAgain={w('tryAgain')}>
      {(list) => (
        <>
          <El page={page} id="searchMembers">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: colors.card, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.md, minHeight: 52, marginBottom: space.md }}>
              <Ionicons name="search" size={20} color={colors.muted} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder={w('searchMembers')}
                placeholderTextColor={colors.muted}
                accessibilityLabel={w('searchMembers')}
                autoCorrect={false}
                style={[{ flex: 1, fontSize: 17, color: colors.ink, paddingVertical: 10 }, { outlineStyle: 'none' } as object]}
              />
            </View>
          </El>
          {list.length ? (
            list.map((m, i) => (
              <ListRow key={m.id} icon="person" i={i} title={m.id === user?.id ? `${m.name} (${w('you')})` : m.name} lines={[m.role]} />
            ))
          ) : (
            <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginVertical: space.lg }]}>{w('noMembers')}</Text>
          )}
          <View style={{ alignItems: 'center' }}>
            <El page={page} id="inviteMember"><PillButton label={w('inviteMember')} icon="add" onPress={invite} /></El>
          </View>
        </>
      )}
    </Gate>
  );
}
