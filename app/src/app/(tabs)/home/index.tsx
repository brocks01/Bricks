import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useMe, useToday } from '@/api';
import {
  BigButton,
  HandHeartIcon,
  HeartbeatIcon,
  QueryState,
  Screen,
  SectionCard,
  Text,
  UsersThreeIcon,
  type Icon,
} from '@/components';
import { dayPart } from '@/features/home/greeting';
import { timeToday, TodaySection } from '@/features/home/TodaySection';
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
  { key: 'passItOn', href: '/pass-it-on', icon: HandHeartIcon },
  { key: 'kampung', href: '/kampung', icon: UsersThreeIcon },
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
    return t('home.readout', { greeting, today: todayText });
  };

  return (
    <Screen readOut={readOut} testID="screen-home">
      <Text variant="display" style={styles.greeting}>
        {greeting}
      </Text>

      <Text variant="heading" style={styles.heading}>
        {t('home.today')}
      </Text>
      <QueryState query={today}>{(data) => <TodaySection today={data} />}</QueryState>

      <Text variant="heading" style={styles.heading}>
        {t('home.explore')}
      </Text>
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
});
