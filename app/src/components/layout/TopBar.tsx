import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useReadOut, type ReadOutScript } from '@/features/readout/ReadOutProvider';
import { maxChromeFontScale, screenPadding, space } from '@/theme';

import { BigButton } from '../BigButton';
import { SpeakerHighIcon, StopIcon, WarningIcon } from '../primitives/icons';

export interface TopBarProps {
  readOut?: ReadOutScript;
  /** False only on the SOS screen itself. */
  showHelp?: boolean;
}

/**
 * The fixed controls (docs/02 rule 4). They sit in the same place on every screen:
 * Read it out top-left, Help top-right in red. Never icon-only.
 */
export function TopBar({ readOut, showHelp = true }: TopBarProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { speaking, toggle } = useReadOut();

  return (
    <View style={styles.row}>
      <View style={styles.slot}>
        {readOut ? (
          <BigButton
            variant="outline"
            icon={speaking ? StopIcon : SpeakerHighIcon}
            label={speaking ? t('common.stopReading') : t('common.readOut')}
            labelVariant="bodyStrong"
            maxFontSizeMultiplier={maxChromeFontScale}
            onPress={() => toggle(readOut)}
            testID="topbar-readout"
          />
        ) : null}
      </View>
      <View style={styles.slot}>
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
  slot: {
    flexShrink: 1,
    maxWidth: '60%',
  },
});
