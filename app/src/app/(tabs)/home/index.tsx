import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useMe, useToday } from '@/api';
import {
  BigButton,
  HandHeartIcon,
  GearSixIcon,
  HeartbeatIcon,
  ListRow,
  QueryState,
  Screen,
  SectionCard,
  Text,
  UsersThreeIcon,
  type Icon,
} from '@/components';
import { dayPart } from '@/features/home/greeting';
import { timeToday, TodaySection } from '@/features/home/TodaySection';
import { ReadOutTarget } from '@/features/readout/ReadOutTarget';
import { config } from '@/lib/config';
import { formatTime, formatWhen } from '@/lib/format';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

interface Section {
  key: 'passItOn' | 'kampung' | 'thrive';
  href: Href;
  icon: Icon;
}

/** Same order as the tab bar: skills, community, health. */
const SECTIONS: readonly Section[] = [
  { key: 'kampung', href: '/kampung', icon: UsersThreeIcon },
  { key: 'passItOn', href: '/pass-it-on', icon: HandHeartIcon },
  { key: 'thrive', href: '/thrive', icon: HeartbeatIcon },
];

/**
 * S12 Home. Greeting, then "Today" (check-in, next event, next reminder: at most
 * three things), then the three parts of the app as large, plainly described cards.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const { data: me } = useMe();
  const today = useToday();

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
    // Highlight "Today" and the three sections while each is read.
    const full = t('home.readout', { greeting, today: todayText });
    const at = todayText ? full.indexOf(todayText) : -1;
    if (at < 0) return full;
    return [
      { text: full.slice(0, at) },
      { text: todayText, target: 'today' },
      { text: full.slice(at + todayText.length), target: 'sections' },
    ];
  };

  return (
    <Screen readOut={readOut} testID="screen-home">
      <Text variant="display" style={styles.greeting}>
        {greeting}
      </Text>

      <Text variant="heading" style={styles.heading}>
        {t('home.today')}
      </Text>
      <ReadOutTarget id="today">
        <QueryState query={today}>{(data) => <TodaySection today={data} />}</QueryState>
      </ReadOutTarget>

      <Text variant="heading" style={styles.heading}>
        {t('home.explore')}
      </Text>
      <ReadOutTarget id="sections">
        <View style={styles.sections}>
          {SECTIONS.map(({ key, href, icon }) => (
            <SectionCard
              key={key}
              icon={icon}
              title={t(`home.section.${key}.title`)}
              description={t(`home.section.${key}.description`)}
              onPress={() => router.navigate(href)}
              testID={`home-section-${key}`}
            />
          ))}
        </View>
      </ReadOutTarget>

      <View style={styles.settings}>
        <ListRow
          icon={GearSixIcon}
          label={t('settings.title')}
          onPress={() => router.push('/settings')}
          testID="home-settings"
        />
      </View>

      {config.devTools ? (
        // Developer builds only; never shown in demo or store builds.
        <BigButton
          variant="outline"
          label="Developer: component gallery"
          onPress={() => router.push('/dev/components')}
          testID="home-dev-gallery"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: {
    marginTop: space.xs,
  },
  heading: {
    marginTop: space.md,
  },
  sections: {
    gap: space.sm,
  },
  settings: {
    marginTop: space.md,
  },
});
