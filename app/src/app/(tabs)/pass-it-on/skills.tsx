import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useProfile } from '@/api';
import { BigButton, PlusIcon, QueryState, Screen, Text } from '@/components';
import { SkillCard } from '@/features/passItOn/parts';
import { space } from '@/theme';

/** What I can share (S31, from Activity): each skill they offer, and Share a skill. */
export default function SkillsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const profile = useProfile('me');

  return (
    <Screen
      section="activity"
      title={t('passItOn.canShare')}
      readOut={() =>
        t('passItOn.readoutShare', {
          skills: profile.data?.skills.map((s) => s.title).join(', ') || t('passItOn.noSkills'),
        })
      }
      testID="screen-skills"
      footer={
        <BigButton
          icon={PlusIcon}
          label={t('passItOn.shareSkill')}
          onPress={() => router.push('/pass-it-on/share')}
          testID="share-skill"
        />
      }
    >
      <QueryState query={profile}>
        {(p) => (
          <View style={styles.list}>
            {p.skills.length === 0 ? (
              <Text color="textSecondary">{t('passItOn.noSkills')}</Text>
            ) : (
              p.skills.map((s) => <SkillCard key={s.id} skill={s} testID={`skill-${s.id}`} />)
            )}
          </View>
        )}
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
});
