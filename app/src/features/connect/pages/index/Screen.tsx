import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { getMyCommunities, type MyCommunity } from '../../../../api/communities';
import { Button, Card, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useT } from '../../../../i18n';
import { El, usePageWords } from '../../../../kit';
import { sessionStore } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { connectIndex as page } from './page';

// Connect: a new person sees a card to join or create a community. Someone who already belongs to communities sees them listed.
// Everything shown comes from the account and the database; nothing is made up. Join and Create are "Coming soon" until their pages exist.
export default function ConnectIndex() {
  const w = usePageWords(page);
  const t = useT();
  const { user, status } = useStore(sessionStore);
  const [mine, setMine] = useState<MyCommunity[] | null>(null);
  useEffect(() => {
    if (status !== 'in') return; // wait until the saved sign-in has been checked, so the request carries a token
    getMyCommunities().then(setMine).catch(() => setMine([]));
  }, [status]);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'greetMorning' : hour < 17 ? 'greetAfternoon' : 'greetEvening';
  const first = (user?.display_name ?? '').trim().split(/\s+/)[0] ?? '';

  return (
    <Screen title={first ? w(greet, { name: first }) : w('heading')}>
      {mine && mine.length ? (
        <>
          <El page={page} id="yourCommunities"><Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>{w('yourCommunities')}</Text></El>
          {mine.map((c) => (
            <Card key={c.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Ionicons name="people" size={30} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{c.name}</Text>
                  <Text style={[type.small, { color: colors.muted }]}>{[c.area_name, t('common.members', { n: c.member_count }), c.my_role].filter(Boolean).join(' · ')}</Text>
                </View>
              </View>
            </Card>
          ))}
          <View style={{ height: space.sm }} />
        </>
      ) : null}
      {mine && !mine.length ? (
        <Card tint>
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <Ionicons name="people" size={40} color={colors.accent} />
            <El page={page} id="noCommunity"><Text style={[type.h2, { color: colors.ink, textAlign: 'center' }]}>{w('noCommunity')}</Text></El>
            <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>{w('noCommunityBody')}</Text>
          </View>
        </Card>
      ) : null}
      <El page={page} id="join"><Button label={w('join')} onPress={() => undefined} disabled icon="enter-outline" /></El>
      <View style={{ height: space.sm }} />
      <El page={page} id="create"><Button kind="plain" label={w('create')} onPress={() => undefined} disabled icon="add-circle-outline" /></El>
      <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginTop: space.sm }]}>{w('soon')}</Text>
    </Screen>
  );
}
