import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { borderWidth, color, iconSize, radius, space, touch } from '@/theme';

import { BigButton } from './BigButton';
import { BottomSheet } from './BottomSheet';
import { ArrowCounterClockwiseIcon, MicrophoneIcon, StopIcon, XIcon } from './primitives/icons';
import { Text } from './primitives/Text';

export type ListeningMode = 'listening' | 'thinking' | 'notHeard' | 'denied';

export interface ListeningSheetProps {
  visible: boolean;
  /** What we've heard so far, shown large as it arrives. */
  transcript: string;
  onStop: () => void;
  mode?: ListeningMode;
  onRetry?: () => void;
  onClose?: () => void;
  /** Extra content under the main button (the demo phrase picker on mock data). */
  children?: ReactNode;
}

/**
 * Shown while Buddy listens (S36): a clear "Listening…", the words as they are
 * heard in large text, and one Stop button. If nothing was understood it says
 * so plainly and offers Try again, never a dead end.
 */
export function ListeningSheet({
  visible,
  transcript,
  onStop,
  mode = 'listening',
  onRetry,
  onClose,
  children,
}: ListeningSheetProps) {
  const { t } = useTranslation();
  const close = onClose ?? onStop;
  const title: Record<ListeningMode, string> = {
    listening: t('listening.title'),
    thinking: t('listening.thinking'),
    notHeard: t('listening.notHeard'),
    denied: t('listening.denied'),
  };

  return (
    <BottomSheet visible={visible} onRequestClose={close} testID="listening-sheet">
      <View style={styles.titleRow}>
        <MicrophoneIcon size={iconSize.button} color={color.primary} weight="fill" />
        <Text variant="title" style={styles.flex} accessibilityLiveRegion="polite">
          {title[mode]}
        </Text>
      </View>
      {mode === 'listening' || mode === 'thinking' ? (
        <View style={styles.transcriptBox} accessibilityLiveRegion="polite">
          {transcript ? (
            <Text variant="heading" weight="regular">
              {transcript}
            </Text>
          ) : (
            <Text color="textSecondary">{t('listening.hint')}</Text>
          )}
        </View>
      ) : null}
      {mode === 'listening' ? (
        <BigButton
          size="lg"
          icon={StopIcon}
          label={t('common.stop')}
          onPress={onStop}
          testID="listening-stop"
        />
      ) : null}
      {mode === 'notHeard' && onRetry ? (
        <BigButton
          size="lg"
          icon={ArrowCounterClockwiseIcon}
          label={t('common.tryAgain')}
          onPress={onRetry}
          testID="listening-retry"
        />
      ) : null}
      {children}
      {mode !== 'listening' ? (
        <BigButton
          variant="outline"
          icon={XIcon}
          label={t('common.close')}
          onPress={close}
          testID="listening-close"
        />
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  flex: {
    flex: 1,
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
