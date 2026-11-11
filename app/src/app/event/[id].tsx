import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, View } from 'react-native';

import { useCancelRsvp, useEvent, useMe } from '@/api';
import type { EventDetail } from '@/api/types';
import {
  ActionTiles,
  Avatar,
  AvatarStack,
  BigButton,
  BottomSheet,
  CalendarPlusIcon,
  Card,
  CheckCircleIcon,
  ConfirmSheet,
  CoverArt,
  DotsThreeIcon,
  MapPinIcon,
  PlaceMap,
  QueryState,
  Screen,
  ShareNetworkIcon,
  SheetHeader,
  showToast,
  SignOutIcon,
  Text,
  WhatsappLogoIcon,
  type ActionTile,
} from '@/components';
import { CATEGORY_ICON } from '@/features/events/categories';
import { pageTint } from '@/features/events/tint';
import { useJoinEvent } from '@/features/events/useJoinEvent';
import { googleCalendarUrl } from '@/lib/calendar';
import { formatDay, formatTime, formatWhen } from '@/lib/format';
import { mapsUrl, openExternal } from '@/lib/openExternal';
import { borderWidth, color, iconSize, radius, shadow, space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/**
 * S15 Event details (Luma event page): the page is tinted from the cover; a large
 * square cover, the title, when and whether they're going; three tiles (I'm going /
 * WhatsApp group / More); then Location, Host, who's going and About.
 * Opens over the current tab, so Back returns exactly where the member came from.
 */
export default function EventDetailScreen() {
  const { id, published } = useLocalSearchParams<{ id: string; published?: string }>();
  const query = useEvent(id);
  const { t } = useTranslation();

  return (
    <QueryStateScreen query={query} fallbackTitle={t('kampung.title')}>
      {(event) => <EventBody event={event} published={published === '1'} />}
    </QueryStateScreen>
  );
}

/** Keeps the header (Read it out, Help, Back) on screen while loading or on errors. */
function QueryStateScreen({
  query,
  children,
  fallbackTitle,
}: {
  query: ReturnType<typeof useEvent>;
  children: (event: EventDetail) => ReactNode;
  fallbackTitle: string;
}) {
  const { t } = useTranslation();
  if (query.data) return <>{children(query.data)}</>;
  return (
    <Screen title={fallbackTitle} testID="screen-event">
      <QueryState query={query} notFoundText={t('eventDetail.notFound')}>
        {() => null}
      </QueryState>
    </Screen>
  );
}

function EventBody({ event, published }: { event: EventDetail; published: boolean }) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const { data: me } = useMe();
  const join = useJoinEvent();
  const cancel = useCancelRsvp();
  const [sheet, setSheet] = useState<'more' | 'cancel' | null>(null);

  // "Published." confirms what they just did: a toast, not a lasting banner.
  useEffect(() => {
    if (published) showToast(t('eventDetail.published'));
  }, [published, t]);

  const start = new Date(event.start_at);
  const when = event.end_at
    ? t('eventDetail.timeRange', {
        day: formatDay(start, language, t),
        start: formatTime(start, language),
        end: formatTime(new Date(event.end_at), language),
      })
    : formatWhen(start, language, t);
  const isHost = me !== undefined && event.host.id === me.id;
  const isGoing = event.my_rsvp === 'going';
  const going = t('event.going', { count: event.going_count });
  const host = isHost
    ? t('eventDetail.youHost')
    : t('eventDetail.hostedBy', { name: event.host.name });

  const readOut = () =>
    t('eventDetail.readout', {
      title: event.title,
      when,
      place: event.place_name,
      host,
      going,
      action: isGoing ? t('eventDetail.readoutGoing') : t('eventDetail.readoutJoin'),
    });

  const openWhatsApp = () => void openExternal(event.whatsapp_link!);
  const tiles: ActionTile[] = [
    ...(isGoing
      ? []
      : [
          {
            label: t('event.imGoing'),
            icon: CheckCircleIcon,
            primary: true,
            onPress: () => join(event),
            testID: 'event-join',
          },
        ]),
    ...(event.whatsapp_link
      ? [
          {
            label: t('eventDetail.whatsapp'),
            icon: WhatsappLogoIcon,
            primary: isGoing,
            onPress: openWhatsApp,
            testID: 'event-whatsapp',
          },
        ]
      : []),
    {
      label: t('eventDetail.more'),
      icon: DotsThreeIcon,
      onPress: () => setSheet('more'),
      testID: 'event-more',
    },
  ];

  const share = () => {
    setSheet(null);
    void Share.share({
      message: t('eventDetail.shareMessage', { title: event.title, when, place: event.place_name }),
    });
  };
  const addToCalendar = () => {
    setSheet(null);
    void openExternal(
      googleCalendarUrl({
        title: event.title,
        start,
        end: event.end_at ? new Date(event.end_at) : null,
        place: event.place_name,
        details: event.description,
      }),
    );
  };

  return (
    <Screen readOut={readOut} tint={pageTint(event)} testID="screen-event">
      {/* The cover floats on the tint with a white edge and a soft shadow (Luma). */}
      <View style={styles.cover}>
        <CoverArt
          photoUrl={event.photo_url}
          icon={CATEGORY_ICON[event.category]}
          tint={event.category}
          size="100%"
          rounded="card"
        />
      </View>

      <View style={styles.titleBlock}>
        <Text variant="title">{event.title}</Text>
        <Text color="textSecondary">{when}</Text>
        {isGoing ? (
          <View style={styles.going} testID="event-status">
            <CheckCircleIcon size={iconSize.inline} color={color.badgeGoingText} weight="fill" />
            <Text variant="bodyStrong" color="badgeGoingText">
              {isHost ? t('eventDetail.youHost') : t('event.youreGoing')}
            </Text>
          </View>
        ) : null}
      </View>

      <ActionTiles tiles={tiles} />

      <Card tone="plain" style={styles.card}>
        <Text variant="bodyStrong" color="textSecondary">
          {t('eventDetail.location')}
        </Text>
        <Text variant="heading">{event.place_name}</Text>
        <PlaceMap
          lat={event.lat}
          lng={event.lng}
          label={t('eventDetail.mapOf', { place: event.place_name })}
        />
        <BigButton
          variant="outline"
          icon={MapPinIcon}
          label={t('eventDetail.openMaps')}
          onPress={() => void openExternal(mapsUrl(event.place_name, event.lat, event.lng))}
          testID="event-maps"
        />
      </Card>

      <Card tone="plain" style={styles.card}>
        <View style={styles.hostRow}>
          <Avatar name={event.host.name} photoUrl={event.host.photo_url} />
          <Text variant="bodyStrong" style={styles.flex}>
            {host}
          </Text>
        </View>
        <View style={styles.hostRow} accessible accessibilityLabel={going}>
          <AvatarStack people={event.attendees} total={event.going_count} />
          <Text style={styles.flex}>{going}</Text>
        </View>
      </Card>

      {event.description ? (
        <Card tone="plain" style={styles.card}>
          <Text variant="heading">{t('eventDetail.about')}</Text>
          <Text>{event.description}</Text>
        </Card>
      ) : null}

      <BottomSheet
        visible={sheet === 'more'}
        onRequestClose={() => setSheet(null)}
        testID="event-more-sheet"
      >
        <SheetHeader icon={DotsThreeIcon} title={event.title} text={when} />
        <BigButton
          variant="outline"
          icon={CalendarPlusIcon}
          label={t('eventDetail.addToCalendar')}
          onPress={addToCalendar}
          testID="event-calendar"
        />
        <BigButton
          variant="outline"
          icon={ShareNetworkIcon}
          label={t('eventDetail.share')}
          onPress={share}
          testID="event-share"
        />
        {isGoing && !isHost ? (
          <BigButton
            variant="outline"
            icon={SignOutIcon}
            label={t('eventDetail.cantGo')}
            onPress={() => setSheet('cancel')}
            testID="event-cant-go"
          />
        ) : null}
        <BigButton
          label={t('common.close')}
          onPress={() => setSheet(null)}
          testID="event-more-close"
        />
      </BottomSheet>

      <ConfirmSheet
        visible={sheet === 'cancel'}
        icon={SignOutIcon}
        text={t('eventDetail.cancelConfirm', { title: event.title })}
        onYes={() => {
          setSheet(null);
          cancel.mutate(event.id);
        }}
        onNo={() => setSheet(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: {
    ...shadow.floating,
    borderRadius: radius.card,
    borderWidth: borderWidth.control * 2,
    borderColor: color.bg,
    backgroundColor: color.bg,
  },
  flex: {
    flex: 1,
  },
  titleBlock: {
    gap: space.xxs,
    marginTop: space.xs,
  },
  going: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  card: {
    gap: space.sm,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
});
