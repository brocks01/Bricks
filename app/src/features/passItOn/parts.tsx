import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { BadgeKey, EventCategory, Interest, Profile, SkillOffer, ThankYou } from '@/api/types';
import { BigStatsRow } from '@/components/BigStats';
import { CoverArt } from '@/components/CoverArt';
import { GroupedList, GroupedRow } from '@/components/GroupedList';
import { InfoRow } from '@/components/InfoRow';
import {
  CalendarBlankIcon,
  CertificateIcon,
  ChatCircleTextIcon,
  HandHeartIcon,
  MapPinIcon,
  MedalIcon,
  ThumbsUpIcon,
  type Icon,
} from '@/components/primitives/icons';
import { Text } from '@/components/primitives/Text';
import { Avatar } from '@/components/Avatar';
import { VoiceNoteBubble } from '@/components/VoiceNoteBubble';
import { CATEGORY_ICON } from '@/features/events/categories';
import { formatCount, formatWhen } from '@/lib/format';
import { type CategoryColorKey, color, columnWidth, coverSize, iconSize, space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

const BADGE_ICON: Record<BadgeKey, Icon> = {
  first_session: CertificateIcon,
  ten_thanks: MedalIcon,
  kind_neighbour: HandHeartIcon,
  storyteller: ChatCircleTextIcon,
};

const BADGE_TINT: Record<BadgeKey, CategoryColorKey> = {
  first_session: 'class',
  ten_thanks: 'kids',
  kind_neighbour: 'music',
  storyteller: 'exercise',
};

/** A skill's cover colour and icon come from its first tag, like an event's kind. */
const SKILL_CATEGORY: Record<Interest, EventCategory> = {
  walking: 'walk',
  taichi: 'exercise',
  cooking: 'cooking',
  chess: 'games',
  music: 'music',
  gardening: 'gardening',
  teaching: 'class',
  technology: 'class',
};

export function skillCategory(skill: Pick<SkillOffer, 'tags'>): EventCategory {
  return SKILL_CATEGORY[skill.tags[0] as Interest] ?? 'other';
}

/** One thing they offer, as an event-style row: what, when, where, how many said thanks. */
export function SkillCard({ skill, testID }: { skill: SkillOffer; testID?: string }) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const category = skillCategory(skill);
  return (
    <View style={styles.row} testID={testID}>
      <CoverArt photoUrl={null} icon={CATEGORY_ICON[category]} tint={category} size={COVER} />
      <View style={styles.flex}>
        <Text variant="heading">{skill.title}</Text>
        <InfoRow
          icon={CalendarBlankIcon}
          text={
            skill.start_at
              ? formatWhen(new Date(skill.start_at), language, t)
              : t('passItOn.skill.anyTime')
          }
        />
        {skill.place_name ? <InfoRow icon={MapPinIcon} text={skill.place_name} /> : null}
        <InfoRow
          icon={ThumbsUpIcon}
          text={t('passItOn.skill.thanked', { count: skill.endorsement_count })}
        />
        <Text color="textSecondary">{t('passItOn.skill.free')}</Text>
      </View>
    </View>
  );
}

const COVER = coverSize.md;

/** A thank-you: a voice note (WhatsApp shape) or a one-tap thumbs up. Never stars. */
export function ThankYouItem({ thanks, testID }: { thanks: ThankYou; testID?: string }) {
  const { t } = useTranslation();
  if (thanks.kind === 'voice' && thanks.voice) {
    return (
      <VoiceNoteBubble
        name={thanks.from.name}
        photoUrl={thanks.from.photo_url}
        audioUrl={thanks.voice.audio_url}
        durationS={thanks.voice.duration_s}
        transcript={thanks.voice.transcript}
        skill={thanks.skill?.title}
        testID={testID}
      />
    );
  }
  return (
    <View style={styles.thumb} testID={testID}>
      <Avatar name={thanks.from.name} photoUrl={thanks.from.photo_url} />
      <View style={styles.flex}>
        <Text variant="bodyStrong">{t('passItOn.thanks.thumb', { name: thanks.from.name })}</Text>
        {thanks.skill ? (
          <Text color="textSecondary">{t('voice.forSkill', { skill: thanks.skill.title })}</Text>
        ) : null}
      </View>
      <ThumbsUpIcon size={iconSize.button} color={color.text} weight="fill" />
    </View>
  );
}

/** What I've Given (Apple Health counters): sessions taught · people helped · thank-yous. */
export function GivenStats({ given }: { given: Profile['given'] }) {
  const { t } = useTranslation();
  const { language } = useTypography();
  return (
    <BigStatsRow
      stats={[
        {
          label: t('passItOn.given.sessions'),
          value: formatCount(given.sessions_taught, language),
        },
        { label: t('passItOn.given.people'), value: formatCount(given.people_helped, language) },
        { label: t('passItOn.given.thanks'), value: formatCount(given.thank_yous, language) },
      ]}
      testID="given-stats"
    />
  );
}

/** Badges as a quiet grouped list with coloured icons, never a trophy wall. */
export function BadgeList({ badges }: { badges: Profile['badges'] }) {
  const { t } = useTranslation();
  if (badges.length === 0) return null;
  return (
    <View style={styles.badges}>
      <GroupedList testID="badges">
        {badges.map((b) => (
          <GroupedRow
            key={b.key}
            icon={BADGE_ICON[b.key]}
            tint={BADGE_TINT[b.key]}
            title={t(`passItOn.badge.${b.key}`)}
          />
        ))}
      </GroupedList>
    </View>
  );
}

const styles = StyleSheet.create({
  badges: {
    marginTop: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingVertical: space.xs,
  },
  thumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
  },
  flex: {
    flex: 1,
    minWidth: columnWidth.card,
    gap: space.xxs,
  },
});
