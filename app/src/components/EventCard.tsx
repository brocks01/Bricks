import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { EventSummary } from '@/api/types';
import { CATEGORY_ICON } from '@/features/events/categories';
import { formatWhen } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';
import { color, iconSize, motion, radius, space, touch } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

import { BigButton } from './BigButton';
import { InfoRow } from './InfoRow';
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  MapPinIcon,
  UsersIcon,
  type Icon,
} from './primitives/icons';
import { Text } from './primitives/Text';

export interface EventCardProps {
  event: EventSummary;
  /** Opens the event details (S15). */
  onOpen: () => void;
  /** Joins straight from the card (S16). Hidden once the member is going. */
  onGoing: () => void;
  /** For tests and previews; defaults to the current time. */
  now?: Date;
  /** No photo: for Home's Today section, where space matters most. */
  compact?: boolean;
}

const THUMB = 96;

/** The event's square photo, or its category icon on a grey tile. */
function Thumb({
  photoUrl,
  fallbackIcon: FallbackIcon,
}: {
  photoUrl: string | null;
  fallbackIcon: Icon;
}) {
  const [failed, setFailed] = useState(false);
  if (photoUrl && !failed) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={styles.thumb}
        contentFit="cover"
        transition={motion.base}
        accessible={false}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View style={[styles.thumb, styles.thumbFallback]} accessible={false}>
      <FallbackIcon size={iconSize.hero} color={color.primary} weight="regular" />
    </View>
  );
}

/**
 * Luma-style event row: a square photo on the left; who's hosting, the title, when and
 * where on the right; then one button. The row and the button are separate touch targets
 * (never nested), so screen readers can reach both.
 */
export function EventCard({ event, onOpen, onGoing, now, compact = false }: EventCardProps) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const when = formatWhen(new Date(event.start_at), language, t, now);
  const going = t('event.going', { count: event.going_count });
  const isGoing = event.my_rsvp === 'going';

  return (
    <View style={styles.card} testID={`event-card-${event.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${event.title}. ${when}. ${event.place_name}. ${going}.`}
        accessibilityHint={t('event.openHint')}
        onPress={() => {
          tapFeedback();
          onOpen();
        }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        testID={`event-card-${event.id}-open`}
      >
        {compact ? null : (
          <Thumb photoUrl={event.photo_url} fallbackIcon={CATEGORY_ICON[event.category]} />
        )}
        <View style={styles.info}>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {event.host.name}
          </Text>
          <Text variant="heading">{event.title}</Text>
          <InfoRow icon={CalendarBlankIcon} text={when} />
          <InfoRow icon={MapPinIcon} text={event.place_name} />
          <InfoRow icon={UsersIcon} text={going} textColor="textSecondary" />
        </View>
      </Pressable>

      <View style={styles.action}>
        {isGoing ? (
          <View
            style={styles.goingRow}
            accessibilityRole="text"
            testID={`event-card-${event.id}-going`}
          >
            <CheckCircleIcon size={iconSize.button} color={color.success} weight="fill" />
            <Text variant="bodyStrong" color="success">
              {t('event.youreGoing')}
            </Text>
          </View>
        ) : (
          <BigButton
            label={t('event.imGoing')}
            onPress={onGoing}
            testID={`event-card-${event.id}-join`}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    backgroundColor: color.bgSubtle,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.sm,
    paddingBottom: 0,
  },
  pressed: {
    backgroundColor: color.primarySubtle,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: radius.tile,
    backgroundColor: color.bg,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: space.xxs,
  },
  action: {
    padding: space.sm,
  },
  goingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: touch.min,
    paddingHorizontal: space.md,
    borderRadius: radius.button,
    backgroundColor: color.successSubtle,
  },
});
