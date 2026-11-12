import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { EventSummary } from '@/api/types';
import { CATEGORY_ICON } from '@/features/events/categories';
import { formatWhen } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';
import { color, iconSize, radius, space, surface } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

import { BigButton } from './BigButton';
import { CoverArt } from './CoverArt';
import { CaretRightIcon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface EventRowProps {
  event: EventSummary;
  /** Opens the event details (where, who's going, join or leave). */
  onOpen: () => void;
  /** Adds "I'm going" beside the row: join in one tap (Home's pick for them). */
  onGoing?: () => void;
  /** The member hosts it: "You're hosting" instead of "You're going". */
  hosting?: boolean;
  now?: Date;
}

const COVER = 64;
/** Narrower than this and the title breaks mid-word ("Eveni / ng"), so "I'm going" moves below. */
const MIN_TITLE_WIDTH = 140;

/**
 * One event as a short white row: a small cover, the title, when, and "You're
 * going" / "You're hosting" in green when it applies. Tapping it opens the event,
 * which has the place and the rest. Used on the tab pages, which fit on one
 * screen; the full list is one tap away.
 *
 * When "I'm going" is long (Tamil, Malay) or the phone is narrow, it would squeeze the
 * title into a column, so it moves onto its own full-width line under the title.
 *
 * With `onGoing`, "I'm going" sits beside it as its own button (never nested inside
 * the row), so both stay reachable with a screen reader.
 */
export function EventRow({ event, onOpen, onGoing, hosting = false, now }: EventRowProps) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const when = formatWhen(new Date(event.start_at), language, t, now);
  const going = event.my_rsvp === 'going';
  const status = going ? t(hosting ? 'event.youreHosting' : 'event.youreGoing') : null;
  const showJoin = !!onGoing && !going;
  // Only ever goes one way, so the row can't flip back and forth while it lays out.
  const [stacked, setStacked] = useState(false);

  return (
    <View style={[styles.card, stacked && styles.cardStacked]} testID={`event-card-${event.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[event.title, when, event.place_name, status]
          .filter(Boolean)
          .join('. ')}
        accessibilityHint={t('event.openHint')}
        onPress={() => {
          tapFeedback();
          onOpen();
        }}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        testID={`event-card-${event.id}-open`}
      >
        <CoverArt
          photoUrl={event.photo_url}
          icon={CATEGORY_ICON[event.category]}
          tint={event.category}
          size={COVER}
        />
        <View
          style={styles.words}
          testID={`event-card-${event.id}-words`}
          onLayout={(e) => {
            if (showJoin && e.nativeEvent.layout.width < MIN_TITLE_WIDTH) setStacked(true);
          }}
        >
          <Text variant="bodyStrong">{event.title}</Text>
          <Text color="textSecondary">
            {when}
            {status ? (
              <Text variant="bodyStrong" color="success">
                {` · ${status}`}
              </Text>
            ) : null}
          </Text>
        </View>
        {showJoin ? null : (
          <CaretRightIcon size={iconSize.inline} color={color.textSecondary} weight="bold" />
        )}
      </Pressable>
      {showJoin ? (
        <View style={stacked ? styles.joinStacked : styles.join}>
          <BigButton
            label={t('event.imGoing')}
            labelVariant="bodyStrong"
            fullWidth={stacked}
            onPress={onGoing}
            testID={`event-card-${event.id}-join`}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.card,
    backgroundColor: color.bg,
    ...surface,
  },
  cardStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.xs + space.xxs - surface.borderWidth,
    borderRadius: radius.card,
  },
  pressed: {
    backgroundColor: color.primarySubtle,
  },
  words: {
    flex: 1,
    gap: space.xxs,
  },
  join: {
    paddingRight: space.xs + space.xxs - surface.borderWidth,
  },
  joinStacked: {
    paddingHorizontal: space.xs + space.xxs - surface.borderWidth,
    paddingBottom: space.xs + space.xxs - surface.borderWidth,
  },
});
