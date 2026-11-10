import { useTranslation } from 'react-i18next';

import { BigButton } from './BigButton';
import { Card } from './Card';
import { MicrophoneIcon } from './primitives/icons';
import { Text } from './primitives/Text';
import { VoicePlayer } from './VoicePlayer';

export interface PromptCardProps {
  /** The question: "I spent 30 years as…". */
  prompt: string;
  audioUrl?: string | null;
  durationS?: number;
  transcript?: string | null;
  /** Shows a record button (own profile only). */
  onRecord?: () => void;
  testID?: string;
}

/**
 * Hinge-style profile prompt: a question answered by voice instead of a form.
 * Shows the answer as a player plus its transcript, or a plain "No answer yet".
 */
export function PromptCard({
  prompt,
  audioUrl,
  durationS,
  transcript,
  onRecord,
  testID,
}: PromptCardProps) {
  const { t } = useTranslation();
  const hasAnswer = !!audioUrl;

  return (
    <Card testID={testID}>
      <Text variant="heading">{prompt}</Text>
      {hasAnswer ? (
        <VoicePlayer
          audioUrl={audioUrl}
          durationS={durationS}
          testID={testID && `${testID}-player`}
        />
      ) : (
        <Text color="textSecondary">{t('prompt.noAnswer')}</Text>
      )}
      {transcript ? <Text>“{transcript}”</Text> : null}
      {onRecord ? (
        <BigButton
          variant="outline"
          icon={MicrophoneIcon}
          label={hasAnswer ? t('prompt.recordAgain') : t('prompt.record')}
          onPress={onRecord}
          testID={testID && `${testID}-record`}
        />
      ) : null}
    </Card>
  );
}
