import { useCallback, useEffect, useState } from 'react';
import { useLiveEpoch } from '../../../../core/useFocusLive';
import { Pressable, Text, View } from 'react-native';
import { ApiError } from '../../../../api/client';
import { familyApi, type AccessLevel, type Delegation } from '../../../../api/family';
import { BackScreen } from '../../../../components/BackButton';
import { Button, ErrorText } from '../../../../components/ui';
import { El, usePageData, usePageWords, type PageDataInput } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore, setActiveProfile } from '../../../../session/store';
import { useStore } from '../../../../core/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { familyAccounts as page } from './page';

const LEVEL_WORDS = { setup: 'levelSetup', ongoing: 'levelOngoing', full: 'levelFull' } as const;

export default function Accounts() {
  const w = usePageWords(page);
  const go = useNavigate();
  const session = useStore(sessionStore);
  const [held, setHeld] = useState<Delegation[] | null>(null);
  const [about, setAbout] = useState<Delegation[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([familyApi.held(), familyApi.aboutMe()])
      .then(([h, a]) => {
        setFailed(false);
        setHeld(h.delegations);
        setAbout(a.delegations);
      })
      .catch(() => setFailed(true));
  }, []);
  const liveEpoch = useLiveEpoch();
  useEffect(() => {
    if (session.status === 'in') load();
  }, [session.status, load, liveEpoch]);

  const acting = session.activeProfile ? held?.find((d) => d.user_id === session.activeProfile) : null;
  const actingName = acting?.user_name ?? session.user?.display_name ?? '';

  const switchTo = (d: Delegation | null) => {
    setActiveProfile(d?.user_id ?? null);
    setError(null);
  };

  const changeLevel = async (d: Delegation, level: AccessLevel) => {
    setError(null);
    try {
      await familyApi.changeLevel(d.id, level);
      load();
    } catch (e) {
      // The helper may only lower their own access; the person may change it either way. The server says which.
      setError(e instanceof ApiError && e.code === 'supported_only' ? w('supportedOnly') : w('failed'));
    }
  };

  const revokeHeld = async (d: Delegation) => {
    setError(null);
    try {
      await familyApi.revoke(d.id);
      if (session.activeProfile === d.user_id) setActiveProfile(null);
      load();
    } catch {
      setError(w('failed'));
    }
  };

  const levelWord = (l: string) => w(LEVEL_WORDS[l as keyof typeof LEVEL_WORDS] ?? 'levelSetup');

  const shown: PageDataInput | null =
    held && about
      ? {
          values: [
            { label: w('me'), value: session.user?.display_name ?? '' },
            { label: w('helpers'), value: String(held.length) },
          ],
          images: [],
          lists: [
            { label: w('helpers'), items: held.map((d) => ({ label: d.user_name ?? '', detail: levelWord(d.level) })) },
            { label: w('access'), items: about.map((d) => ({ label: d.helper_name ?? '', detail: levelWord(d.level) })) },
          ],
          actions: [{ id: 'history', label: w('history'), run: () => { go('family.history'); } }],
        }
      : null;
  usePageData(page, shown);

  if (failed) {
    return (
      <BackScreen title={w('heading')}>
        <ErrorText>{w('failed')}</ErrorText>
        <Button label={w('tryAgain')} onPress={load} />
      </BackScreen>
    );
  }

  const chip = (label: string, active: boolean, onPress: () => void, danger = false) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 10, borderRadius: radius.button, backgroundColor: active ? colors.accentSoft : colors.card, borderWidth: 1, borderColor: active ? colors.accentLine : colors.line }}
    >
      <Text style={{ fontSize: 13, fontWeight: '700', color: danger ? colors.danger : active ? colors.accent : colors.ink }}>{label}</Text>
    </Pressable>
  );

  return (
    <BackScreen title={w('heading')}>
      {session.activeProfile ? (
        <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.card, borderWidth: 1, borderColor: colors.accentLine, padding: space.md, marginBottom: space.md }}>
          <El page={page} id="acting">
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{w('acting', { name: actingName })}</Text>
          </El>
          <El page={page} id="backToMe">
            <View>
              <Button label={w('backToMe')} icon="person-outline" onPress={() => switchTo(null)} kind="plain" />
            </View>
          </El>
        </View>
      ) : null}

      <El page={page} id="helpers">
        <Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>{w('helpers')}</Text>
      </El>
      {(held ?? []).length === 0 ? (
        <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('noHelpers')}</Text>
      ) : (
        (held ?? []).map((d) => (
          <View key={d.id} style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.accent }}>{(d.user_name ?? '?').trim().charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{d.user_name ?? '—'}</Text>
                <Text style={[type.small, { color: colors.muted }]}>{levelWord(d.level)}</Text>
              </View>
              {session.activeProfile === d.user_id ? (
                <Text style={[type.small, { color: colors.accent, fontWeight: '700' }]}>{w('using')}</Text>
              ) : (
                <Pressable accessibilityRole="button" onPress={() => switchTo(d)} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.button, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentLine }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accent }}>{w('switch')}</Text>
                </Pressable>
              )}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
              {(['setup', 'ongoing', 'full'] as AccessLevel[]).map((l) => chip(levelWord(l), d.level === l, () => void changeLevel(d, l)))}
              {chip(w('revoke'), false, () => void revokeHeld(d), true)}
            </View>
          </View>
        ))
      )}

      <El page={page} id="access">
        <Text style={[type.h2, { color: colors.ink, marginTop: space.lg, marginBottom: space.sm }]}>{w('access')}</Text>
      </El>
      {(about ?? []).length === 0 ? (
        <Text style={[type.body, { color: colors.muted }]}>{w('noAccess')}</Text>
      ) : (
        (about ?? []).map((d) => (
          <View key={d.id} style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.sm }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{d.helper_name ?? '—'}</Text>
            <Text style={[type.small, { color: colors.muted }]}>{levelWord(d.level)}</Text>
          </View>
        ))
      )}

      <ErrorText>{error}</ErrorText>
      <El page={page} id="history">
        <Button label={w('history')} icon="document-text-outline" onPress={() => go('family.history')} kind="plain" />
      </El>
    </BackScreen>
  );
}
