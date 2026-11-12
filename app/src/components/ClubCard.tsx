import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CircleSummary } from '@/api/types';
import { formatWhen } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';
import { color, radius, space, type CategoryColorKey } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

import { BigButton } from './BigButton';
import { CoverArt } from './CoverArt';
import { InfoRow } from './InfoRow';
import { CalendarBlankIcon, UsersIcon, UsersThreeIcon, WhatsappLogoIcon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface ClubCardProps {
  circle: CircleSummary;
  /** Opens the Circle page (S19). */
  onOpen: () => void;
  /** Member not yet in the Circle. */
  onJoin: () => void;
  /** Opens the Circle's WhatsApp group link. */
  onWhatsApp: () => void;
  now?: Date;
}

/** A Circle's cover colour when it has no photo, by kind of Circle. */
export const CIRCLE_TINT: Record<CircleSummary['type'], CategoryColorKey> = {
  neighbourhood: 'meetup',
  interest: 'exercise',
  org: 'class',
};

/**
 * A Circle as a Luma calendar row: a square cover, the name, members and the next
 * activity, then at most two actions. Members get "Join WhatsApp group" + "See events";
 * everyone else gets one "Join this Circle" button. No rankings or leaderboards.
 */
export function ClubCard({ circle, onOpen, onJoin, onWhatsApp, now }: ClubCardProps) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const members = t('circle.members', { count: circle.member_count });
  const next = circle.next_event
    ? t('circle.next', {
        title: circle.next_event.title,
        when: formatWhen(new Date(circle.next_event.start_at), language, t, now),
      })
    : t('circle.noNext');

  return (
    <View style={styles.card} testID={`club-card-${circle.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${circle.name}. ${members}. ${next}.`}
        onPress={() => {
          tapFeedback();
          onOpen();
        }}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        testID={`club-card-${circle.id}-open`}
      >
        <CoverArt
          photoUrl={circle.photo_url}
          icon={UsersThreeIcon}
          tint={CIRCLE_TINT[circle.type]}
          size={COVER}
        />
        <View style={styles.info}>
          <Text variant="heading">{circle.name}</Text>
          <InfoRow icon={UsersIcon} text={members} textColor="textSecondary" />
          <InfoRow icon={CalendarBlankIcon} text={next} />
        </View>
      </Pressable>

      <View style={styles.actions}>
        {circle.is_member ? (
          <>
            {circle.whatsapp_link ? (
              <BigButton
                icon={WhatsappLogoIcon}
                label={t('event.joinWhatsApp')}
                onPress={onWhatsApp}
                testID={`club-card-${circle.id}-whatsapp`}
              />
            ) : null}
            <BigButton
              variant="outline"
              icon={CalendarBlankIcon}
              label={t('circle.seeEvents')}
              onPress={onOpen}
              testID={`club-card-${circle.id}-events`}
            />
          </>
        ) : (
          <BigButton
            label={t('circle.join')}
            onPress={onJoin}
            testID={`club-card-${circle.id}-join`}
          />
        )}
      </View>
    </View>
  );
}

const COVER = 96;

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    paddingVertical: space.sm,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: space.sm,
    borderRadius: radius.tile,
  },
  pressed: {
    backgroundColor: color.primarySubtle,
  },
  info: {
    flex: 1,
    minWidth: 180,
    gap: space.xxs,
  },
  actions: {
    gap: space.xs,
  },
});
