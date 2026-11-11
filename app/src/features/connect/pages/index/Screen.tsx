import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Button, Card, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { El, useAction, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { connectIndex as page } from './page';

// Connect: the landing view. Nothing here is made up: the greeting uses the person's own name, and until they belong to a community
// (not built yet) the card invites them to join or create one. Join and Create are shown as "Coming soon".
export default function ConnectIndex() {
  const w = usePageWords(page);
  const go = useNavigate();
  const { user } = useStore(sessionStore);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'greetMorning' : hour < 17 ? 'greetAfternoon' : 'greetEvening';
  const first = (user?.display_name ?? '').trim().split(/\s+/)[0] ?? '';
  useAction(page, 'explore', () => go('connect.hub'));

  return (
    <Screen title={first ? w(greet, { name: first }) : w('heading')}>
      <Card tint>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <Ionicons name="people" size={44} color={colors.accent} />
          <El page={page} id="noCommunity">
            <Text style={[type.h2, { color: colors.ink, textAlign: 'center' }]}>{w('noCommunity')}</Text>
          </El>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center' }]}>{w('noCommunityBody')}</Text>
        </View>
        <View style={{ height: space.md }} />
        <El page={page} id="join"><Button label={w('join')} onPress={() => undefined} disabled icon="enter-outline" /></El>
        <View style={{ height: space.sm }} />
        <El page={page} id="create"><Button kind="plain" label={w('create')} onPress={() => undefined} disabled icon="add-circle-outline" /></El>
        <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginTop: space.sm }]}>{w('soon')}</Text>
      </Card>
      <El page={page} id="explore"><Button kind="plain" label={w('explore')} onPress={() => go('connect.hub')} icon="compass-outline" /></El>
    </Screen>
  );
}
