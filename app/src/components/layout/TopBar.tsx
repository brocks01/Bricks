import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useReadOut, type ReadOutScript } from '@/features/readout/ReadOutProvider';
import { maxChromeFontScale, screenPadding, space } from '@/theme';
import { useCompact } from '@/theme/TypographyProvider';

import { BigButton } from '../BigButton';
import { SpeakerHighIcon, StopIcon, WarningIcon } from '../primitives/icons';

export interface TopBarProps {
  readOut?: ReadOutScript;
  /** False only on the SOS screen itself. */
  showHelp?: boolean;
  /** The screen's read-out owner id (see useReadOut().speak). */
  owner?: string;
}

/**
 * The fixed controls (docs/02 rule 4). They sit in the same place on every screen:
 * Read it out top-left, Help top-right in red. Never icon-only.
 */
export function TopBar({ readOut, showHelp = true, owner }: TopBarProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { speaking, toggle } = useReadOut();
  const compact = useCompact();

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <View style={styles.slot}>
        {readOut ? (
          <BigButton
            variant="chrome"
            icon={speaking ? StopIcon : SpeakerHighIcon}
            label={speaking ? t('common.stopReading') : t('common.readOut')}
            labelVariant="bodyStrong"
            maxFontSizeMultiplier={maxChromeFontScale}
            onPress={() => toggle(readOut, owner)}
            testID="topbar-readout"
          />
        ) : null}
      </View>
      <View style={styles.helpSlot}>
        {showHelp ? (
          <BigButton
            variant="sos"
            icon={WarningIcon}
            label={t('common.help')}
            labelVariant="bodyStrong"
            maxFontSizeMultiplier={maxChromeFontScale}
            onPress={() => router.push('/sos')}
            testID="topbar-help"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: space.sm,
    paddingHorizontal: screenPadding,
    paddingTop: space.xs,
    paddingBottom: space.xs,
  },
  rowCompact: {
    paddingTop: space.xxs,
    paddingBottom: space.xxs,
  },
  slot: {
    flexShrink: 1,
    maxWidth: '60%',
  },
  // Help is one short word in every language: it keeps its full width so it never
  // breaks mid-word ("Hel / p" on a large-font Android phone); Read it out wraps instead.
  helpSlot: {
    flexShrink: 0,
    maxWidth: '60%',
  },
});
