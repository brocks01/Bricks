import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useEvents, useMe, useToday } from '@/api';
import { BigButton, GearSixIcon, QueryState, Screen, Text } from '@/components';
import { dayPart } from '@/features/home/greeting';
import { PickedForYou, timeToday, TodaySection } from '@/features/home/TodaySection';
import { YourEvents } from '@/features/home/YourEvents';
import { ReadOutTarget } from '@/features/readout/ReadOutTarget';
import { formatTime, formatWhen } from '@/lib/format';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/**
 * S12 Home: everything for today on one screen, no scrolling. The greeting with
 * Settings beside it, then the check-in and the next reminder (each answered in
 * place), the next event they're going to, and one event picked for them (joinable
 * in one tap). Community, Activity and Health are the tab bar's job, so Home
 * doesn't repeat them.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const { data: me } = useMe();
  const today = useToday();
  const events = useEvents(null);

  const part = dayPart();
  const name = me?.preferred_name ?? me?.name;
  const greeting = name ? t(`home.greeting.${part}`, { name }) : t(`home.greetingNoName.${part}`);

  // Where you are → what's on today → what you can do.
  const readOut = () => {
    const d = today.data;
    let todayText = '';
    if (d?.checkin.pending) todayText += t('home.readoutCheckin');
    if (d?.next_event) {
      todayText += t('home.readoutEvent', {
        title: d.next_event.title,
        when: formatWhen(new Date(d.next_event.start_at), language, t),
      });
    }
    if (d?.next_reminder) {
      todayText += t('home.readoutReminder', {
        time: formatTime(timeToday(d.next_reminder.time), language),
        text: d.next_reminder.text,
      });
    }
    // Highlight "Today" while it's read.
    const full = t('home.readout', { greeting, today: todayText });
    const at = todayText ? full.indexOf(todayText) : -1;
    if (at < 0) return full;
    return [
      { text: full.slice(0, at) },
      { text: todayText, target: 'today' },
      { text: full.slice(at + todayText.length) },
    ];
  };

  return (
    <Screen section="home" readOut={readOut} testID="screen-home">
      <View style={styles.header}>
        <Text variant="heading" style={styles.greeting}>
          {greeting}
        </Text>
        <BigButton
          variant="outline"
          fullWidth={false}
          icon={GearSixIcon}
          label={t('settings.title')}
          labelVariant="bodyStrong"
          onPress={() => router.push('/settings')}
          testID="home-settings"
        />
      </View>

      <ReadOutTarget id="today">
        <QueryState query={today}>{(data) => <TodaySection today={data} />}</QueryState>
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
