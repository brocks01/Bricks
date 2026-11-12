import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useEvents, useMe, useToday } from '@/api';
import { BigButton, GearSixIcon, QueryState, Screen, Text } from '@/components';
import { SimpleHome } from '@/features/home/SimpleHome';
import { PickedForYou, TodaySection } from '@/features/home/TodaySection';
import { useGreeting, useHomeReadout } from '@/features/home/useHomeReadout';
import { YourEvents } from '@/features/home/YourEvents';
import { ReadOutTarget } from '@/features/readout/ReadOutTarget';
import { space } from '@/theme';

/**
 * S12 Home: everything for today on one screen, no scrolling. The greeting with
 * Settings beside it, then the check-in and the next reminder (each answered in
 * place), the next event they're going to, and one event picked for them (joinable
 * in one tap). Community, Activity and Health are the tab bar's job, so Home
 * doesn't repeat them. In Simple Mode (S13) Home is three big buttons instead.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: me } = useMe();
  const today = useToday();
  const events = useEvents(null);

  const greeting = useGreeting();

  const readOut = useHomeReadout();

  if (me?.simple_mode) return <SimpleHome />;

  return (
    <Screen section="home" readOut={readOut} testID="screen-home">
      <View style={styles.header}>
        <Text variant="heading" style={styles.greeting}>
          {greeting}
        </Text>
        <BigButton
          variant="chrome"
          fullWidth={false}
          icon={GearSixIcon}
          label={t('settings.title')}
          labelVariant="bodyStrong"
          onPress={() => router.push('/settings')}
          testID="home-settings"
        />
      </View>

      <ReadOutTarget id="today">
        <QueryState query={today} loadingText={t('home.loading')}>
          {(data) => <TodaySection today={data} />}
        </QueryState>
      </ReadOutTarget>

      {/* Coming up: their next plan, then one picked for them (I'm going in one tap). */}
      <QueryState query={events}>{(list) => <YourEvents events={list} meId={me?.id} />}</QueryState>
      {today.data ? <PickedForYou today={today.data} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  greeting: {
    flex: 1,
    minWidth: '50%',
  },
});
