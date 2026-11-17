import { Ionicons } from '@expo/vector-icons';
import { useLiveEpoch } from '../../../../core/useFocusLive';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BackScreen } from '../../../../components/BackButton';
import { Button, ErrorText } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { El, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { loadFamilies, useFamilies } from '../../state';
import { familyHome as page } from './page';

export default function FamilyTab() {
  const w = usePageWords(page);
  const go = useNavigate();
  const { status } = useStore(sessionStore);
  const { families } = useFamilies();
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    loadFamilies().then(() => setFailed(false)).catch(() => setFailed(true));
  }, []);
  const liveEpoch = useLiveEpoch();
  useEffect(() => {
    if (status === 'in') load();
  }, [status, load, liveEpoch]);

  const role = (r: string) => w(`role${r[0].toUpperCase()}${r.slice(1)}`);

  return (
    <BackScreen title={w('heading')} subtitle={w('intro')}>
      {families === null && !failed ? null : (
        <>
          {(families?.length ?? 0) === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: space.xl, gap: space.md }}>
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="people" size={44} color={colors.accent} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: space.sm }}>{w('empty')}</Text>
              <Text style={[type.body, { color: colors.muted, textAlign: 'center', maxWidth: 280 }]}>{w('emptyHint')}</Text>
            </View>
          ) : (
            (families ?? []).map((f) => (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                onPress={() => go('family.detail', { id: f.id })}
                style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md }}
              >
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="people" size={22} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{f.name}</Text>
                  <Text style={[type.small, { color: colors.muted }]}>
                    {[w('members', { n: f.member_count }), role(f.role)].join(' · ')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Pressable>
            ))
          )}
          {failed ? <ErrorText>{w('tryAgain')}</ErrorText> : null}
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
            <View style={{ flex: 1 }}>
              <El page={page} id="create">
                <Button label={w('create')} icon="add" onPress={() => go('family.create')} kind="primary" />
              </El>
            </View>
            <View style={{ flex: 1 }}>
              <El page={page} id="join">
                <Button label={w('join')} icon="key-outline" onPress={() => go('family.join')} kind="plain" />
              </El>
            </View>
          </View>
        </>
      )}
    </BackScreen>
  );
}
