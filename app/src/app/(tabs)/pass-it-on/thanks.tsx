import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useProfile } from '@/api';
import { EmptyState, QueryState, Screen } from '@/components';
import { ThankYouItem } from '@/features/passItOn/parts';
import { space } from '@/theme';

/**
 * S34 Thank-You Wall (WhatsApp voice notes): everyone who said thank you, newest
 * first. Voice thank-yous play like WhatsApp voice notes, with the words written
 * underneath. Only kind words: no stars, no ratings.
 */
export default function ThankYouWallScreen() {
  const { t } = useTranslation();
  const profile = useProfile('me');

  return (
    <Screen
      section="activity"
      title={t('passItOn.wall')}
      readOut={() => {
        const list = profile.data?.thank_yous ?? [];
        const voices = list.filter((x) => x.voice?.transcript);
        return [
          t('passItOn.wallReadout', { count: list.length }),
          ...voices.map((x) =>
            t('passItOn.wallReadoutVoice', { name: x.from.name, words: x.voice!.transcript }),
          ),
        ].join(' ');
      }}
      testID="screen-thanks-wall"
    >
      <QueryState query={profile}>
        {(p) =>
          p.thank_yous.length === 0 ? (
            <EmptyState text={t('passItOn.noThanks')} />
          ) : (
            <View style={styles.list}>
              {p.thank_yous.map((th) => (
                <ThankYouItem key={th.id} thanks={th} testID={`wall-${th.id}`} />
              ))}
            </View>
          )
        }
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
});
