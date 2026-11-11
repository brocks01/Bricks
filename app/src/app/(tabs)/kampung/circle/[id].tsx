import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useCircle, useJoinCircle, useLeaveCircle } from '@/api';
import {
  Avatar,
  AvatarStack,
  BigButton,
  Card,
  CoverArt,
  EventCard,
  QueryState,
  Screen,
  SealCheckIcon,
  Text,
  UsersThreeIcon,
  WhatsappLogoIcon,
} from '@/components';
import { CIRCLE_TINT } from '@/components/ClubCard';
import { speakEvent } from '@/features/events/readout';
import { useJoinEvent } from '@/features/events/useJoinEvent';
import { openExternal } from '@/lib/openExternal';
import { useUndo } from '@/state/undo';
import { borderWidth, categoryColor, color, iconSize, radius, shadow, space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/**
 * S19 Circle page (Luma's calendar page): tinted in the Circle's colour, a square
 * cover, the name, members, description and captain; one main action (WhatsApp
 * group for members, Join for everyone else); what's coming up; who's in it.
 * Group-walk feed and Cheers arrive in 3.2.
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
    <Screen
      readOut={readOut}
      footer={footer}
      tint={circle ? categoryColor[CIRCLE_TINT[circle.type]].bg : undefined}
      testID="screen-circle"
    >
      <QueryState query={query} notFoundText={t('circlePage.notFound')}>
        {(c) => (
          <>
            <View style={styles.cover}>
              <CoverArt
                photoUrl={c.photo_url}
                icon={UsersThreeIcon}
                tint={CIRCLE_TINT[c.type]}
                size={COVER}
                rounded="card"
              />
            </View>
            <Text variant="display">{c.name}</Text>
            <Text variant="bodyStrong" color="textSecondary">
              {members}
            </Text>
            <Text>{c.description}</Text>

            <Card tone="plain" style={styles.captain}>
              <Avatar name={c.captain.name} photoUrl={c.captain.photo_url} />
              <SealCheckIcon size={iconSize.inline} color={color.primary} weight="fill" />
              <Text variant="bodyStrong" style={styles.flex}>
                {t('circlePage.captain', { name: c.captain.name })}
              </Text>
            </Card>

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
            <View style={styles.members} accessible accessibilityLabel={members}>
              <AvatarStack people={c.members} total={c.member_count} />
              <Text style={styles.flex}>{members}</Text>
            </View>
          </>
        )}
      </QueryState>
    </Screen>
  );
}

const COVER = 128;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  cover: {
    ...shadow.floating,
    alignSelf: 'flex-start',
    marginTop: space.xs,
    borderRadius: radius.card,
    borderWidth: borderWidth.control * 2,
    borderColor: color.bg,
    backgroundColor: color.bg,
  },
  captain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  members: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  heading: {
    marginTop: space.lg,
  },
  list: {
    gap: space.xs,
  },
});
