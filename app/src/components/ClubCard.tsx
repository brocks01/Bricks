import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CircleSummary } from '@/api/types';
import { formatWhen } from '@/lib/format';
import { tapFeedback } from '@/lib/haptics';
import { color, space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

import { BigButton } from './BigButton';
import { Card } from './Card';
import { InfoRow } from './InfoRow';
import { PhotoHeader } from './PhotoHeader';
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

/**
 * Strava-Clubs-style Circle card: banner, name, members, the next activity, and
 * at most two actions. Members get "Join WhatsApp group" + "See events";
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
    <Card padded={false} testID={`club-card-${circle.id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${circle.name}. ${members}. ${next}.`}
        onPress={() => {
          tapFeedback();
          onOpen();
        }}
        style={({ pressed }) => pressed && styles.pressed}
        testID={`club-card-${circle.id}-open`}
      >
        <PhotoHeader photoUrl={circle.photo_url} fallbackIcon={UsersThreeIcon} aspectRatio={2} />
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
  actions: {
    padding: space.md,
    paddingTop: space.sm,
    gap: space.sm,
  },
});
