import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useProfile } from '@/api';
import type { Profile } from '@/api/types';
import {
  Avatar,
  BigButton,
  BookOpenIcon,
  Card,
  MicrophoneIcon,
  QueryState,
  Screen,
  SealCheckIcon,
  Tag,
  TagRow,
  Text,
  UserCircleIcon,
  VoicePlayer,
} from '@/components';
import { BadgeList } from '@/features/passItOn/parts';
import { INTEREST_ICON } from '@/features/profile/interests';
import { color, iconSize, space } from '@/theme';

/**
 * My story (S31, from Activity): their voice intro with the words written out,
 * "Ask me about", Record again, See my profile, and their badges. A detail page:
 * it may scroll.
 */
export default function MyStoryScreen() {
  const { t } = useTranslation();
  const profile = useProfile('me');

  return (
    <Screen
      section="activity"
      title={t('passItOn.myStory')}
      readOut={() =>
        [t('passItOn.myStory'), profile.data?.intro?.transcript].filter(Boolean).join('. ')
      }
      testID="screen-my-story"
    >
      <QueryState query={profile}>{(p) => <StoryBody profile={p} />}</QueryState>
    </Screen>
  );
}

function StoryBody({ profile: p }: { profile: Profile }) {
  const { t } = useTranslation();
  const router = useRouter();
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
          icon={BookOpenIcon}
          label={t('stories.title')}
          onPress={() => router.push('/stories')}
          testID="life-stories-row"
        />
        <BigButton
          variant="outline"
          icon={UserCircleIcon}
          label={t('passItOn.seeProfile')}
          onPress={() => router.push('/profile')}
          testID="see-profile"
        />
      </Card>
      <BadgeList badges={p.badges} />
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
});
