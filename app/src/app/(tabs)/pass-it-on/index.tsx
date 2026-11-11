import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useProfile, useThanksPrompts } from '@/api';
import type { Profile } from '@/api/types';
import {
  Avatar,
  BigButton,
  Card,
  HandHeartIcon,
  MicrophoneIcon,
  PlusIcon,
  QueryState,
  Screen,
  SealCheckIcon,
  Tag,
  TagRow,
  Text,
  UserCircleIcon,
  VoicePlayer,
} from '@/components';
import { BadgeList, GivenStats, SkillCard, ThankYouItem } from '@/features/passItOn/parts';
import { INTEREST_ICON } from '@/features/profile/interests';
import { ReadOutTarget } from '@/features/readout/ReadOutTarget';
import type { ReadOutPart } from '@/features/readout/script';
import { color, iconSize, space } from '@/theme';

/** How many thank-yous to show before "See all". */
const WALL_PREVIEW = 2;

/**
 * S31 Pass It On (Hinge profile + Apple Health counters): a thank-you prompt if
 * there's one waiting, My Story (voice intro, "Ask me about"), What I Can Share
 * with Share a skill, What I've Given, badges, and the newest thank-yous.
 */
export default function PassItOnScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useProfile('me');
  const prompts = useThanksPrompts();
  const prompt = prompts.data?.[0];

  const readOut = (): ReadOutPart[] => {
    const p = profile.data;
    const parts: ReadOutPart[] = [{ text: `${t('passItOn.title')}.` }];
    if (prompt) {
      parts.push({
        text: t('passItOn.prompt.question', { name: prompt.host.name, event: prompt.event_title }),
        target: 'prompt',
      });
    }
    if (p) {
      parts.push(
        {
          text: t('passItOn.readoutShare', {
            skills: p.skills.map((s) => s.title).join(', ') || t('passItOn.noSkills'),
          }),
          target: 'share',
        },
        {
          text: t('passItOn.readoutGiven', {
            sessions: p.given.sessions_taught,
            people: p.given.people_helped,
            thanks: p.given.thank_yous,
          }),
          target: 'given',
        },
      );
    }
    parts.push({ text: t('passItOn.readoutActions') });
    return parts;
  };

  return (
    <Screen title={t('passItOn.title')} readOut={readOut} testID="screen-pass-it-on">
      {prompt ? (
        <ReadOutTarget id="prompt">
          <Card testID="thanks-prompt-card">
            <Text variant="heading">
              {t('passItOn.prompt.question', { name: prompt.host.name, event: prompt.event_title })}
            </Text>
            <BigButton
              icon={HandHeartIcon}
              label={t('passItOn.prompt.open', { name: prompt.host.name })}
              onPress={() =>
                router.push({ pathname: '/thank/[eventId]', params: { eventId: prompt.event_id } })
              }
              testID="thanks-prompt-open"
            />
          </Card>
        </ReadOutTarget>
      ) : null}

      <QueryState query={profile}>{(p) => <PassItOnBody profile={p} />}</QueryState>
    </Screen>
  );
}

function PassItOnBody({ profile: p }: { profile: Profile }) {
  const { t } = useTranslation();
  const router = useRouter();
  const wall = p.thank_yous.slice(0, WALL_PREVIEW);

  return (
    <>
      <Card testID="my-story">
        <View style={styles.who}>
          <Avatar name={p.name} photoUrl={p.photo_url} size={64} />
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <Text variant="heading">{p.preferred_name ?? p.name}</Text>
              {p.singpass_verified ? (
                <View accessible accessibilityLabel={t('profile.verified')}>
                  <SealCheckIcon size={iconSize.inline} color={color.primary} weight="fill" />
                </View>
              ) : null}
            </View>
            {p.area_name ? <Text color="textSecondary">{p.area_name}</Text> : null}
          </View>
        </View>
        <Text variant="bodyStrong">{t('passItOn.myStory')}</Text>
        {p.intro ? (
          <>
            <VoicePlayer
              audioUrl={p.intro.audio_url}
              durationS={p.intro.duration_s}
              speakerName={p.name}
              testID="my-intro"
            />
            {p.intro.transcript ? <Text>“{p.intro.transcript}”</Text> : null}
          </>
        ) : (
          <Text color="textSecondary">{t('passItOn.noIntro')}</Text>
        )}
        <BigButton
          variant="outline"
          icon={MicrophoneIcon}
          label={p.intro ? t('prompt.recordAgain') : t('passItOn.recordIntro')}
          onPress={() => router.push('/pass-it-on/intro')}
          testID="my-intro-record"
        />
        {p.ask_me_about.length > 0 ? (
          <>
            <Text variant="bodyStrong">{t('profile.askMeAbout')}</Text>
            <TagRow>
              {p.ask_me_about.map((i) => (
                <Tag key={i} icon={INTEREST_ICON[i]} label={t(`interests.${i}`)} />
              ))}
            </TagRow>
          </>
        ) : null}
        <BigButton
          variant="outline"
          icon={UserCircleIcon}
          label={t('passItOn.seeProfile')}
          onPress={() => router.push('/profile')}
          testID="see-profile"
        />
      </Card>

      <ReadOutTarget id="share">
        <Text variant="title" style={styles.heading}>
          {t('passItOn.canShare')}
        </Text>
        <View style={styles.list}>
          {p.skills.length === 0 ? (
            <Text color="textSecondary">{t('passItOn.noSkills')}</Text>
          ) : (
            p.skills.map((s) => <SkillCard key={s.id} skill={s} testID={`skill-${s.id}`} />)
          )}
          <BigButton
            icon={PlusIcon}
            label={t('passItOn.shareSkill')}
            onPress={() => router.push('/pass-it-on/share')}
            testID="share-skill"
          />
        </View>
      </ReadOutTarget>

      <ReadOutTarget id="given">
        <Text variant="title" style={styles.heading}>
          {t('passItOn.given.title')}
        </Text>
        <GivenStats given={p.given} />
        <BadgeList badges={p.badges} />
      </ReadOutTarget>

      <Text variant="title" style={styles.heading}>
        {t('passItOn.wall')}
      </Text>
      <View style={styles.list}>
        {wall.map((th) => (
          <ThankYouItem key={th.id} thanks={th} testID={`thanks-${th.id}`} />
        ))}
        {p.thank_yous.length > WALL_PREVIEW ? (
          <BigButton
            variant="outline"
            label={t('passItOn.seeAllThanks', { count: p.thank_yous.length })}
            onPress={() => router.push('/pass-it-on/thanks')}
            testID="see-all-thanks"
          />
        ) : null}
        {p.thank_yous.length === 0 ? (
          <Text color="textSecondary">{t('passItOn.noThanks')}</Text>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
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
  heading: {
    marginTop: space.md,
  },
  list: {
    gap: space.sm,
  },
});
