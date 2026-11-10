import { useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useCancelRsvp, useEvent, useMe } from '@/api';
import type { EventDetail } from '@/api/types';
import {
  Avatar,
  BigButton,
  CalendarBlankIcon,
  Card,
  ConfirmSheet,
  InfoRow,
  MapPinIcon,
  PeopleRow,
  PhotoHeader,
  QueryState,
  Screen,
  StatusBanner,
  Text,
  WhatsappLogoIcon,
} from '@/components';
import { CATEGORY_ICON } from '@/features/events/categories';
import { useJoinEvent } from '@/features/events/useJoinEvent';
import { formatDay, formatTime, formatWhen } from '@/lib/format';
import { mapsUrl, openExternal } from '@/lib/openExternal';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/**
 * S15 Event details (Luma event page): photo, title, when, where (with Open in
 * Maps), host, who's going, a short "About", and one primary action at the bottom.
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
  const [confirming, setConfirming] = useState(false);

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

  const footer = isGoing ? (
    <>
      {event.whatsapp_link ? (
        <BigButton
          icon={WhatsappLogoIcon}
          label={t('event.joinWhatsApp')}
          onPress={() => void openExternal(event.whatsapp_link!)}
          testID="event-whatsapp"
        />
      ) : null}
      {isHost ? null : (
        <BigButton
          variant="outline"
          label={t('eventDetail.cantGo')}
          onPress={() => setConfirming(true)}
          testID="event-cant-go"
        />
      )}
    </>
  ) : (
    <BigButton label={t('event.imGoing')} onPress={() => join(event)} testID="event-join" />
  );

  return (
    <Screen readOut={readOut} footer={footer} testID="screen-event">
      <Card padded={false}>
        <PhotoHeader photoUrl={event.photo_url} fallbackIcon={CATEGORY_ICON[event.category]} />
      </Card>

      <Text variant="title">{event.title}</Text>

      {published ? <StatusBanner tone="success" text={t('eventDetail.published')} /> : null}
      {isGoing && !published ? (
        <StatusBanner
          tone="success"
          text={isHost ? t('eventDetail.youHost') : t('event.youreGoing')}
        />
      ) : null}

      <View style={styles.facts}>
        <InfoRow icon={CalendarBlankIcon} text={when} />
        <InfoRow icon={MapPinIcon} text={event.place_name} />
      </View>
      <BigButton
        variant="outline"
        icon={MapPinIcon}
        label={t('eventDetail.openMaps')}
        onPress={() => void openExternal(mapsUrl(event.place_name, event.lat, event.lng))}
        testID="event-maps"
      />

      <View style={styles.hostRow}>
        <Avatar name={event.host.name} photoUrl={event.host.photo_url} />
        <Text variant="bodyStrong" style={styles.flex}>
          {host}
        </Text>
      </View>

      <PeopleRow people={event.attendees} label={going} />

      {event.description ? (
        <View style={styles.about}>
          <Text variant="heading">{t('eventDetail.about')}</Text>
          <Text>{event.description}</Text>
        </View>
      ) : null}

      <ConfirmSheet
        visible={confirming}
        text={t('eventDetail.cancelConfirm', { title: event.title })}
        onYes={() => {
          setConfirming(false);
          cancel.mutate(event.id);
        }}
        onNo={() => setConfirming(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  facts: {
    gap: space.xs,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.xs,
  },
  about: {
    gap: space.xs,
    marginTop: space.xs,
  },
});
