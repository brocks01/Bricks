import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { familyApi, type Family, type FamilyMember } from '../../../../api/family';
import { Button, ErrorText, Field, Screen } from '../../../../components/ui';
import { El, usePageData, usePageWords, type PageDataInput } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { invalidateFamilies } from '../../state';
import { familyDetail as page } from './page';

export default function FamilyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = usePageWords(page);
  const go = useNavigate();
  const [data, setData] = useState<Family | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [claim, setClaim] = useState<{ name: string; code: string } | null>(null);

  const load = useCallback(() => {
    familyApi
      .get(String(id))
      .then((f) => {
        setFailed(false);
        setData(f);
        setNewName(f.name);
      })
      .catch(() => setFailed(true));
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (run: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await run();
      load();
    } catch {
      setError(w('failed'));
    } finally {
      setBusy(false);
    }
  };

  const handOver = async (m: FamilyMember) => {
    setError(null);
    setBusy(true);
    try {
      const c = await familyApi.askClaimCode(String(id), m.user_id);
      setClaim({ name: m.display_name ?? '', code: c.code });
    } catch {
      setError(w('failed'));
    } finally {
      setBusy(false);
    }
  };

  const remove = (m: FamilyMember) =>
    Alert.alert(w('remove'), w('removeConfirm'), [
      { text: w('remove'), style: 'destructive', onPress: () => void act(() => familyApi.removeMember(String(id), m.user_id)) },
      { text: w('done') },
    ]);

  const isOwner = data?.my_role === 'owner';
  const canHelp = isOwner || data?.my_role === 'helper';

  // What the agent may read and press: this family as it is really showing.
  const shown: PageDataInput | null = data
    ? {
        values: [
          { label: w('heading'), value: data.name },
          { label: w('member'), value: String(data.members.length) },
        ],
        images: [],
        lists: [
          {
            label: w('member'),
            items: data.members.map((m) => ({
              label: m.display_name ?? '',
              detail: [w(m.role), m.login_kind === 'assisted' ? w('assistedTag') : '', m.is_me ? w('you') : ''].filter(Boolean).join(' · '),
              actions: [
                ...(isOwner && !m.is_me && m.role !== 'owner'
                  ? [{ id: `remove${m.user_id.slice(0, 4)}`, label: w('remove'), run: () => remove(m) }]
                  : []),
                ...(canHelp && m.login_kind === 'assisted' && !m.is_me
                  ? [{ id: `claim${m.user_id.slice(0, 4)}`, label: w('giveAccount'), run: () => void handOver(m) }]
                  : []),
              ],
            })),
          },
        ],
        actions: [
          ...(canHelp ? [{ id: 'invite', label: w('invite'), run: () => { go('family.invite', { id: String(id) }); } }] : []),
          ...(canHelp ? [{ id: 'assisted', label: w('assisted'), run: () => { go('family.assisted', { id: String(id) }); } }] : []),
          ...(isOwner ? [{ id: 'rename', label: w('rename'), run: () => { setRenaming(true); } }] : []),
        ],
      }
    : null;
  usePageData(page, shown);

  if (failed) {
    return (
      <Screen title={w('heading')} back>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('notFound')}</Text>
        <Button label={w('tryAgain')} onPress={load} />
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen title={w('heading')} back>
        <View />
      </Screen>
    );
  }

  return (
    <Screen title={data.name} back>
      {claim ? (
        <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.card, borderWidth: 1, borderColor: colors.accentLine, padding: space.md, marginBottom: space.md }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>{w('claimTitle', { name: claim.name })}</Text>
          <Text style={{ fontSize: 40, fontWeight: '900', letterSpacing: 8, color: colors.accent, textAlign: 'center', marginVertical: space.sm }}>{claim.code}</Text>
          <Text style={[type.small, { color: colors.ink, marginBottom: space.md }]}>{w('claimNote')}</Text>
          <Button label={w('done')} onPress={() => setClaim(null)} kind="plain" />
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
        {canHelp ? (
          <>
            <View style={{ flex: 1 }}>
              <El page={page} id="invite">
                <Button label={w('invite')} icon="person-add-outline" onPress={() => go('family.invite', { id: String(id) })} />
              </El>
            </View>
            <View style={{ flex: 1 }}>
              <El page={page} id="assisted">
                <Button label={w('assisted')} icon="hand-left-outline" onPress={() => go('family.assisted', { id: String(id) })} kind="plain" />
              </El>
            </View>
          </>
        ) : null}
      </View>

      {data.members.map((m) => (
        <View
          key={m.user_id}
          style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.sm }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.accent }}>{(m.display_name ?? '?').trim().charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>
                {m.display_name ?? '—'}{m.is_me ? ` (${w('you')})` : ''}
              </Text>
              <Text style={[type.small, { color: colors.muted }]}>
                {[w(m.role), m.login_kind === 'assisted' ? w('assistedTag') : ''].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
          {(isOwner && !m.is_me && m.role !== 'owner') || (canHelp && m.login_kind === 'assisted' && !m.is_me) ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
              {canHelp && m.login_kind === 'assisted' && !m.is_me ? (
                <Pressable accessibilityRole="button" onPress={() => void handOver(m)} disabled={busy} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.button, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentLine }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent }}>{w('giveAccount')}</Text>
                </Pressable>
              ) : null}
              {isOwner && m.role !== 'owner' ? (
                <Pressable accessibilityRole="button" onPress={() => void act(() => familyApi.changeRole(String(id), m.user_id, m.role === 'helper' ? 'member' : 'helper'))} disabled={busy} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.button, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>{m.role === 'helper' ? w('makeMember') : w('makeHelper')}</Text>
                </Pressable>
              ) : null}
              {isOwner && m.role !== 'owner' ? (
                <Pressable accessibilityRole="button" onPress={() => remove(m)} disabled={busy} style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.button, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.danger }}>{w('remove')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      ))}

      {renaming && isOwner ? (
        <View style={{ marginTop: space.md }}>
          <El page={page} id="rename">
            <View>
              <Field label={w('renameNew')} value={newName} onChangeText={setNewName} icon="pencil-outline" maxLength={80} />
              <Button label={w('renameSave')} onPress={() => void act(() => familyApi.rename(String(id), newName.trim()))} disabled={busy} />
              <Button label={w('done')} onPress={() => setRenaming(false)} kind="plain" />
            </View>
          </El>
        </View>
      ) : null}

      <ErrorText>{error}</ErrorText>

      {!isOwner ? (
        <El page={page} id="leave">
          <Button
            label={w('leave')}
            icon="log-out-outline"
            kind="danger"
            onPress={() =>
              void act(async () => {
                await familyApi.leave(String(id));
                invalidateFamilies();
                go('family.home');
              })
            }
            disabled={busy}
          />
        </El>
      ) : null}
    </Screen>
  );
}
