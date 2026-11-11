import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { BadgeKey, Profile, SkillOffer, ThankYou } from '@/api/types';
import { BigStatsRow } from '@/components/BigStats';
import { Card } from '@/components/Card';
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
import { formatCount, formatWhen } from '@/lib/format';
import { color, iconSize, space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

const BADGE_ICON: Record<BadgeKey, Icon> = {
  first_session: CertificateIcon,
  ten_thanks: MedalIcon,
  kind_neighbour: HandHeartIcon,
  storyteller: ChatCircleTextIcon,
};

/** One thing they offer: what, when, where, and how many people thanked them for it. */
export function SkillCard({ skill, testID }: { skill: SkillOffer; testID?: string }) {
  const { t } = useTranslation();
  const { language } = useTypography();
  return (
    <Card testID={testID}>
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
    </Card>
  );
}

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
    <Card tone="subtle" testID={testID}>
      <View style={styles.thumb}>
        <Avatar name={thanks.from.name} photoUrl={thanks.from.photo_url} />
        <View style={styles.flex}>
          <Text variant="bodyStrong">{t('passItOn.thanks.thumb', { name: thanks.from.name })}</Text>
          {thanks.skill ? (
            <Text color="textSecondary">{t('voice.forSkill', { skill: thanks.skill.title })}</Text>
          ) : null}
        </View>
        <ThumbsUpIcon size={iconSize.button} color={color.primary} weight="fill" />
      </View>
    </Card>
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

/** Badges as plain labelled icons, never a trophy wall. */
export function BadgeList({ badges }: { badges: Profile['badges'] }) {
  const { t } = useTranslation();
  if (badges.length === 0) return null;
  return (
    <View style={styles.badges} testID="badges">
      {badges.map((b) => (
        <InfoRow key={b.key} icon={BADGE_ICON[b.key]} text={t(`passItOn.badge.${b.key}`)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
  badges: {
    gap: space.xs,
  },
});
