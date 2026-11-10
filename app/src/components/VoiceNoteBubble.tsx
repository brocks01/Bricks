import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme';

import { Avatar } from './Avatar';
import { Card } from './Card';
import { Text } from './primitives/Text';
import { VoicePlayer } from './VoicePlayer';

export interface VoiceNoteBubbleProps {
  name: string;
  photoUrl?: string | null;
  audioUrl: string;
  durationS?: number;
  /** What was said, always shown under the player. */
  transcript?: string | null;
  /** The skill this thank-you is for ("Chess"). */
  skill?: string;
  testID?: string;
}

/**
 * A thank-you or story as a voice note, in the WhatsApp shape seniors already
 * know: who sent it, a player, and the words written underneath.
 */
export function VoiceNoteBubble({
  name,
  photoUrl,
  audioUrl,
  durationS,
  transcript,
  skill,
  testID,
}: VoiceNoteBubbleProps) {
  const { t } = useTranslation();

  return (
    <Card tone="subtle" testID={testID}>
      <View style={styles.header}>
        <Avatar name={name} photoUrl={photoUrl} />
        <View style={styles.who}>
          <Text variant="bodyStrong">{name}</Text>
          {skill ? <Text color="textSecondary">{t('voice.forSkill', { skill })}</Text> : null}
        </View>
      </View>
      <VoicePlayer
        audioUrl={audioUrl}
        durationS={durationS}
        speakerName={name}
        testID={testID && `${testID}-player`}
      />
      {transcript ? <Text>“{transcript}”</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  who: {
    flex: 1,
  },
});
