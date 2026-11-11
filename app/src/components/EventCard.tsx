import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import type { EventSummary } from '@/api/types';
import { CATEGORY_ICON } from '@/features/events/categories';
import { formatWhen } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';
import { color, iconSize, radius, space, touch } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

import { Avatar } from './Avatar';
import { BigButton } from './BigButton';
import { CoverArt } from './CoverArt';
import { CheckCircleIcon, ClockIcon, MapPinIcon } from './primitives/icons';
import { Text } from './primitives/Text';
import { StatusBadge } from './StatusBadge';

export interface EventCardProps {
  event: EventSummary;
  /** Opens the event details (S15). */
  onOpen: () => void;
  /** Joins straight from the card (S16). Hidden once the member is going. */
  onGoing: () => void;
  /** For tests and previews; defaults to the current time. */
  now?: Date;
  /** Smaller cover: for Home's Today section, where space matters most. */
  compact?: boolean;
  /** The member hosts it: a "Hosting" badge instead of "Going". */
  hosting?: boolean;
}

const COVER = 104;
const COVER_COMPACT = 80;
/** From this system font size up, the cover sits above the words so they keep the full width. */
const STACK_AT_FONT_SCALE = 1.5;

/**
 * A Luma event row: a square cover (photo or category art) with a status badge,
 * then the host, title, when and where; "12 going" and one pill button below.
 *
 * The cover + facts area and the button are separate touch targets (never nested),
 * so screen readers can reach both.
 */
export function EventCard({
  event,
  onOpen,
  onGoing,
  now,
  compact = false,
  hosting = false,
}: EventCardProps) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const { fontScale } = useWindowDimensions();
  const when = formatWhen(new Date(event.start_at), language, t, now);
  const going = t('event.going', { count: event.going_count });
  const isGoing = event.my_rsvp === 'going';
  const stacked = fontScale >= STACK_AT_FONT_SCALE;
  const badge = hosting ? 'hosting' : isGoing ? 'going' : null;

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
        style={({ pressed }) => [styles.body, stacked && styles.stacked, pressed && styles.pressed]}
        testID={`event-card-${event.id}-open`}
      >
        <CoverArt
          photoUrl={event.photo_url}
          icon={CATEGORY_ICON[event.category]}
          tint={event.category}
          size={compact ? COVER_COMPACT : COVER}
          overlay={badge ? <StatusBadge kind={badge} /> : null}
        />
        <View style={styles.facts}>
          <View style={styles.host}>
            <Avatar name={event.host.name} photoUrl={event.host.photo_url} size={32} />
            <Text variant="caption" color="textSecondary" style={styles.flex}>
              {event.host.name}
            </Text>
          </View>
          <Text variant="heading">{event.title}</Text>
          <Fact icon={ClockIcon} text={when} />
          <Fact icon={MapPinIcon} text={event.place_name} />
        </View>
      </Pressable>

      <View style={styles.footer}>
        <Text color="textSecondary">{going}</Text>
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

function Fact({ icon: IconComponent, text }: { icon: typeof ClockIcon; text: string }) {
  return (
    <View style={styles.fact}>
      <IconComponent size={iconSize.inline} color={color.textSecondary} weight="regular" />
      <Text style={styles.flex}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    paddingVertical: space.sm,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    borderRadius: radius.tile,
  },
  stacked: {
    flexDirection: 'column',
  },
  pressed: {
    backgroundColor: color.bgSubtle,
  },
  facts: {
    flex: 1,
    alignSelf: 'stretch',
    gap: space.xxs,
  },
  host: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.xs,
  },
  flex: {
    flex: 1,
  },
  footer: {
    gap: space.xs,
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
