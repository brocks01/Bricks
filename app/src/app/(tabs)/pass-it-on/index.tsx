import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useProfile, useThanksPrompts } from '@/api';
import type { Profile } from '@/api/types';
import {
  BigButton,
  Card,
  GroupedList,
  GroupedRow,
  HandHeartIcon,
  LightbulbIcon,
  QueryState,
  Screen,
  Text,
  ThumbsUpIcon,
  UserCircleIcon,
} from '@/components';
import { GivenStats } from '@/features/passItOn/parts';
import { ReadOutTarget } from '@/features/readout/ReadOutTarget';
import type { ReadOutPart } from '@/features/readout/script';

/**
 * S31 Activity (Pass It On), on one screen: a thank-you prompt if one is waiting,
 * rows that open My story, What I can share (with Share a skill) and the
 * Thank-You Wall, then What I've Given as three big numbers. The detail pages may scroll;
 * this one doesn't.
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
    <Screen
      section="activity"
      title={t('passItOn.title')}
      readOut={readOut}
      testID="screen-pass-it-on"
    >
      {prompt ? (
        <ReadOutTarget id="prompt">
          <Card testID="thanks-prompt-card">
            <Text variant="bodyStrong">
              {t('passItOn.prompt.question', { name: prompt.host.name, event: prompt.event_title })}
            </Text>
            <BigButton
              icon={HandHeartIcon}
              label={t('passItOn.prompt.openShort')}
              accessibilityLabel={t('passItOn.prompt.open', { name: prompt.host.name })}
              labelVariant="bodyStrong"
              onPress={() =>
                router.push({ pathname: '/thank/[eventId]', params: { eventId: prompt.event_id } })
              }
              testID="thanks-prompt-open"
            />
          </Card>
        </ReadOutTarget>
      ) : null}

      <QueryState query={profile}>{(p) => <ActivityBody profile={p} />}</QueryState>
    </Screen>
  );
}

function ActivityBody({ profile: p }: { profile: Profile }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <>
      <ReadOutTarget id="share">
        <GroupedList>
          <GroupedRow
            icon={UserCircleIcon}
            tint="games"
            title={t('passItOn.myStory')}
            subtitle={p.intro ? undefined : t('passItOn.noIntro')}
            onPress={() => router.push('/pass-it-on/story')}
            testID="my-story-row"
          />
          <GroupedRow
            icon={LightbulbIcon}
            tint="class"
            title={t('passItOn.canShare')}
            value={String(p.skills.length)}
            onPress={() => router.push('/pass-it-on/skills')}
            testID="can-share-row"
          />
          <GroupedRow
            icon={ThumbsUpIcon}
            tint="music"
            title={t('passItOn.wall')}
            value={String(p.thank_yous.length)}
            onPress={() => router.push('/pass-it-on/thanks')}
            testID="see-all-thanks"
          />
        </GroupedList>
      </ReadOutTarget>
      <ReadOutTarget id="given">
        <GivenStats given={p.given} />
      </ReadOutTarget>
    </>
  );
}
