import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { borderWidth, color, iconSize, radius, space, touch } from '@/theme';

import { BigButton } from './BigButton';
import { BottomSheet } from './BottomSheet';
import { MicrophoneIcon, StopIcon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface ListeningSheetProps {
  visible: boolean;
  /** What we've heard so far, shown large as it arrives. */
  transcript: string;
  onStop: () => void;
}

/**
 * Shown while Buddy listens (S36): a clear "Listening…", the words as they are
 * heard in large text, and one Stop button.
 */
export function ListeningSheet({ visible, transcript, onStop }: ListeningSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomSheet visible={visible} onRequestClose={onStop} testID="listening-sheet">
      <View style={styles.titleRow}>
        <MicrophoneIcon size={iconSize.button} color={color.primary} weight="fill" />
        <Text variant="title">{t('listening.title')}</Text>
      </View>
      <View style={styles.transcriptBox} accessibilityLiveRegion="polite">
        {transcript ? (
          <Text variant="heading" weight="regular">
            {transcript}
          </Text>
        ) : (
          <Text color="textSecondary">{t('listening.hint')}</Text>
        )}
      </View>
      <BigButton
        size="lg"
        icon={StopIcon}
        label={t('common.stop')}
        onPress={onStop}
        testID="listening-stop"
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  transcriptBox: {
    minHeight: touch.min * 1.5,
    padding: space.md,
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    borderColor: color.border,
    backgroundColor: color.bgSubtle,
    justifyContent: 'center',
  },
});
