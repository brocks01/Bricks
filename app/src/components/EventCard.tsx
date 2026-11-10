import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { EventSummary } from '@/api/types';
import { CATEGORY_ICON } from '@/features/events/categories';
import { formatWhen } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';
import { color, iconSize, radius, space, touch } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

import { BigButton } from './BigButton';
import { Card } from './Card';
import { InfoRow } from './InfoRow';
import { PhotoHeader } from './PhotoHeader';
import { CalendarBlankIcon, CheckCircleIcon, MapPinIcon, UsersIcon } from './primitives/icons';
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

/**
 * Luma-style event card: one photo, the title, when, where, who's going and one
 * button. Facts sit on separate lines with icons instead of a dense "·" line.
 *
 * The photo + facts area and the button are separate touch targets (never nested),
 * so screen readers can reach both.
 */
export function EventCard({ event, onOpen, onGoing, now, compact = false }: EventCardProps) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const when = formatWhen(new Date(event.start_at), language, t, now);
  const going = t('event.going', { count: event.going_count });
  const isGoing = event.my_rsvp === 'going';

  return (
    <Card padded={false} testID={`event-card-${event.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${event.title}. ${when}. ${event.place_name}. ${going}.`}
        accessibilityHint={t('event.openHint')}
        onPress={() => {
          tapFeedback();
          onOpen();
        }}
        style={({ pressed }) => pressed && styles.pressed}
        testID={`event-card-${event.id}-open`}
      >
        {compact ? null : (
          <PhotoHeader photoUrl={event.photo_url} fallbackIcon={CATEGORY_ICON[event.category]} />
        )}
        <View style={styles.info}>
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
    </Card>
  );
}

const styles = StyleSheet.create({
  pressed: {
    backgroundColor: color.bgSubtle,
  },
  info: {
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    gap: space.xs,
  },
  action: {
    padding: space.md,
    paddingTop: space.sm,
  },
  goingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: touch.min,
    paddingHorizontal: space.sm,
    borderRadius: radius.button,
    backgroundColor: color.successSubtle,
  },
});
