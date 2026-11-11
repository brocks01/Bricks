import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useProfile } from '@/api';
import type { Profile } from '@/api/types';
import {
  Avatar,
  Chip,
  ChipGroup,
  QueryState,
  Screen,
  SealCheckIcon,
  Tag,
  TagRow,
  Text,
  ThumbsUpIcon,
  InfoRow,
  VoicePlayer,
} from '@/components';
import { BadgeList, GivenStats, SkillCard, ThankYouItem } from '@/features/passItOn/parts';
import { INTEREST_ICON } from '@/features/profile/interests';
import { LANGUAGE_INFO } from '@/i18n/languages';
import { color, iconSize, space } from '@/theme';

type Section = 'given' | 'share';

/**
 * S33 Profile (Hinge profile as a stack of cards): photo, name, area, languages
 * and the Singpass tick; the voice intro; "Ask me about"; then two clear buttons,
 * What I've Given and What I Can Share, instead of tabs or swiping. Endorsements
 * are counted per skill. This is how other members see them.
 */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const profile = useProfile('me');

  return (
    <Screen
      title={t('profile.title')}
      readOut={() => {
        const p = profile.data;
        if (!p) return t('profile.title');
        return t('profile.readout', {
          name: p.name,
          area: p.area_name ?? '',
          about: p.ask_me_about.map((i) => t(`interests.${i}`)).join(', '),
        });
      }}
      testID="screen-profile"
    >
      <QueryState query={profile}>{(p) => <ProfileBody profile={p} />}</QueryState>
    </Screen>
  );
}

function ProfileBody({ profile: p }: { profile: Profile }) {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>('given');
  const endorsed = p.skills.filter((s) => s.endorsement_count > 0);

  return (
    <>
      {/* Luma profile: a big face, the name large, then who they are. */}
      <View style={styles.header}>
        <Avatar name={p.name} photoUrl={p.photo_url} size={96} />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <Text variant="title">{p.name}</Text>
            {p.singpass_verified ? (
              <SealCheckIcon size={iconSize.inline} color={color.primary} weight="fill" />
            ) : null}
          </View>
          {p.singpass_verified ? <Text color="textSecondary">{t('profile.verified')}</Text> : null}
          {p.area_name ? <Text>{p.area_name}</Text> : null}
          <Text color="textSecondary">
            {t('profile.speaks', {
              languages: p.languages.map((l) => LANGUAGE_INFO[l].nativeName).join(', '),
            })}
          </Text>
        </View>
      </View>

      {p.intro ? (
        <View style={styles.block}>
          <VoicePlayer
            audioUrl={p.intro.audio_url}
            durationS={p.intro.duration_s}
            speakerName={p.name}
            testID="profile-intro"
          />
          {p.intro.transcript ? <Text>“{p.intro.transcript}”</Text> : null}
        </View>
      ) : null}

      {p.ask_me_about.length > 0 ? (
        <View style={styles.block}>
          <Text variant="bodyStrong">{t('profile.askMeAbout')}</Text>
          <TagRow>
            {p.ask_me_about.map((i) => (
              <Tag key={i} icon={INTEREST_ICON[i]} label={t(`interests.${i}`)} />
            ))}
          </TagRow>
        </View>
      ) : null}

      {endorsed.map((s) => (
        <InfoRow
          key={s.id}
          icon={ThumbsUpIcon}
          text={t('profile.endorsed', { skill: s.title, count: s.endorsement_count })}
        />
      ))}

      <ChipGroup>
        <Chip
          label={t('passItOn.given.title')}
          selected={section === 'given'}
          onPress={() => setSection('given')}
          testID="profile-given"
        />
        <Chip
          label={t('passItOn.canShare')}
          selected={section === 'share'}
          onPress={() => setSection('share')}
          testID="profile-share"
        />
      </ChipGroup>

      {section === 'given' ? (
        <View style={styles.block} testID="profile-given-section">
          <GivenStats given={p.given} />
          <BadgeList badges={p.badges} />
        </View>
      ) : (
        <View style={styles.block} testID="profile-share-section">
          {p.skills.length === 0 ? (
            <Text color="textSecondary">{t('passItOn.noSkills')}</Text>
          ) : (
            p.skills.map((s) => <SkillCard key={s.id} skill={s} />)
          )}
        </View>
      )}

      <Text variant="heading" style={styles.heading}>
        {t('passItOn.wall')}
      </Text>
      <View style={styles.block}>
        {p.thank_yous.slice(0, 2).map((th) => (
          <ThankYouItem key={th.id} thanks={th} />
        ))}
        {p.thank_yous.length === 0 ? (
          <Text color="textSecondary">{t('passItOn.noThanks')}</Text>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    flexWrap: 'wrap',
  },
  flex: {
    flex: 1,
  },
  block: {
    gap: space.sm,
  },
  heading: {
    marginTop: space.md,
  },
});
