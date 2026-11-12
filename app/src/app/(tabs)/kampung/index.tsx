import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useCircles, useEvents } from '@/api';
import {
  BigButton,
  CalendarBlankIcon,
  EmptyState,
  EventRow,
  GroupedList,
  GroupedRow,
  ListBulletsIcon,
  MapTrifoldIcon,
  PlusIcon,
  QueryState,
  Screen,
  Text,
  UsersThreeIcon,
} from '@/components';
import { speakEvent } from '@/features/events/readout';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/** The tab fits on one screen: the next few happenings, then "See all". */
export const COMMUNITY_PREVIEW = 2;

/**
 * Community tab (S14): fits on one screen, no scrolling. My Circles, the next
 * happenings near them as short rows (each opens the event, where they join), and
 * See all / Map, which open the full list. "Start something" stays at the bottom.
 */
export default function KampungScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const events = useEvents(null);
  const circles = useCircles();

  const myCount = circles.data?.mine.length ?? 0;
  const all = events.data ?? [];
  const shown = all.slice(0, COMMUNITY_PREVIEW);

  const readOut = () => {
    const summary =
      all.length > 0
        ? t('kampung.readoutSummary', {
            count: all.length,
            first: speakEvent(all[0]!, language, t),
          })
        : t('kampung.readoutNone');
    return t('kampung.readout', { summary });
  };

  return (
    <Screen
      section="community"
      title={t('kampung.title')}
      readOut={readOut}
      testID="screen-kampung"
      footer={
        <BigButton
          icon={PlusIcon}
          label={t('kampung.startSomething')}
          onPress={() => router.push('/kampung/create')}
          testID="kampung-start"
        />
      }
    >
      <GroupedList>
        <GroupedRow
          icon={UsersThreeIcon}
          tint="meetup"
          title={t('kampung.myCircles.title')}
          subtitle={
            myCount > 0
              ? t('kampung.myCircles.count', { count: myCount })
              : t('kampung.myCircles.none')
          }
          onPress={() => router.push('/kampung/circles')}
          testID="kampung-my-circles"
        />
      </GroupedList>

      <Text variant="heading">{t('kampung.comingUp')}</Text>
      <QueryState query={events}>
        {() =>
          shown.length === 0 ? (
            <EmptyState
              icon={CalendarBlankIcon}
              text={t('kampung.empty')}
              actionLabel={t('kampung.startSomething')}
              onAction={() => router.push('/kampung/create')}
              testID="kampung-empty"
            />
          ) : (
            <View style={styles.list}>
              {shown.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onOpen={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}
                />
              ))}
              <View style={styles.buttons}>
                <View style={styles.flex}>
                  <BigButton
                    variant="outline"
                    icon={ListBulletsIcon}
                    label={t('kampung.seeAll', { count: all.length })}
                    labelVariant="bodyStrong"
                    onPress={() => router.push('/kampung/happenings')}
                    testID="kampung-see-all"
                  />
                </View>
                <View style={styles.flex}>
                  <BigButton
                    variant="outline"
                    icon={MapTrifoldIcon}
                    label={t('kampung.map')}
                    labelVariant="bodyStrong"
                    onPress={() =>
                      router.push({ pathname: '/kampung/happenings', params: { view: 'map' } })
                    }
                    testID="kampung-view-map"
                  />
                </View>
              </View>
            </View>
          )
        }
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.xs + space.xxs,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs + space.xxs,
  },
  flex: {
    flexGrow: 1,
    flexBasis: '40%',
  },
});
