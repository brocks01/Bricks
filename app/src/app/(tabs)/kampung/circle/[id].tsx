import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useCircle, useJoinCircle, useLeaveCircle } from '@/api';
import {
  Avatar,
  BigButton,
  Card,
  EventCard,
  InfoRow,
  PeopleRow,
  PhotoHeader,
  QueryState,
  Screen,
  SealCheckIcon,
  Text,
  UsersIcon,
  UsersThreeIcon,
  WhatsappLogoIcon,
} from '@/components';
import { speakEvent } from '@/features/events/readout';
import { useJoinEvent } from '@/features/events/useJoinEvent';
import { openExternal } from '@/lib/openExternal';
import { useUndo } from '@/state/undo';
import { color, iconSize, space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/**
 * S19 Circle page (Strava club page): banner, name, members, the captain, one
 * main action (WhatsApp group for members, Join for everyone else), what's
 * coming up, and who's in it. Group-walk feed and Cheers arrive in 3.2.
 */
export default function CircleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const query = useCircle(id);
  const joinCircle = useJoinCircle();
  const leaveCircle = useLeaveCircle();
  const joinEvent = useJoinEvent();
  const showUndo = useUndo((s) => s.show);
  const circle = query.data;

  const members = circle ? t('circle.members', { count: circle.member_count }) : '';
  const readOut = () =>
    circle
      ? t('circlePage.readout', {
          name: circle.name,
          members,
          captain: circle.captain.name,
          next: circle.upcoming[0]
            ? `${t('circlePage.comingUp')}: ${speakEvent(circle.upcoming[0], language, t)}.`
            : t('circlePage.noUpcoming'),
        })
      : t('circles.title');

  const footer = circle ? (
    circle.is_member ? (
      circle.whatsapp_link ? (
        <BigButton
          icon={WhatsappLogoIcon}
          label={t('event.joinWhatsApp')}
          onPress={() => void openExternal(circle.whatsapp_link!)}
          testID="circle-whatsapp"
        />
      ) : null
    ) : (
      <BigButton
        label={t('circle.join')}
        onPress={() => {
          joinCircle.mutate(circle.id);
          showUndo(t('circles.joined', { name: circle.name }), () => leaveCircle.mutate(circle.id));
        }}
        testID="circle-join"
      />
    )
  ) : undefined;

  return (
    <Screen readOut={readOut} footer={footer} testID="screen-circle">
      <QueryState query={query} notFoundText={t('circlePage.notFound')}>
        {(c) => (
          <>
            <Card padded={false}>
              <PhotoHeader photoUrl={c.photo_url} fallbackIcon={UsersThreeIcon} aspectRatio={2} />
            </Card>
            <Text variant="title">{c.name}</Text>
            <InfoRow icon={UsersIcon} text={members} textColor="textSecondary" />
            <Text>{c.description}</Text>

            <View style={styles.captain}>
              <Avatar name={c.captain.name} photoUrl={c.captain.photo_url} />
              <SealCheckIcon size={iconSize.inline} color={color.primary} weight="fill" />
              <Text variant="bodyStrong" style={styles.flex}>
                {t('circlePage.captain', { name: c.captain.name })}
              </Text>
            </View>

            <Text variant="heading" style={styles.heading}>
              {t('circlePage.comingUp')}
            </Text>
            {c.upcoming.length > 0 ? (
              <View style={styles.list}>
                {c.upcoming.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onOpen={() =>
                      router.push({ pathname: '/event/[id]', params: { id: event.id } })
                    }
                    onGoing={() => joinEvent(event)}
                  />
                ))}
              </View>
            ) : (
              <Text color="textSecondary">{t('circlePage.noUpcoming')}</Text>
            )}

            <Text variant="heading" style={styles.heading}>
              {t('circlePage.members')}
            </Text>
            <PeopleRow people={c.members} label={members} />
          </>
        )}
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  captain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  heading: {
    marginTop: space.lg,
  },
  list: {
    gap: space.lg,
  },
});
