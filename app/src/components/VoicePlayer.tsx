import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useVoicePlayer } from '@/features/voice/useVoicePlayer';
import { formatDuration } from '@/lib/format';
import { chart, color, columnWidth, space } from '@/theme';

import { BigButton } from './BigButton';
import { PauseIcon, PlayIcon } from './primitives/icons';
import { Text } from './primitives/Text';

export interface VoicePlayerProps {
  audioUrl: string;
  /** Known length from the API, shown before the audio loads. */
  durationS?: number;
  /** Who is speaking, for the screen-reader label ("Play the voice message from Lim"). */
  speakerName?: string;
  testID?: string;
}

const BAR_COUNT = 20;
const WAVE_HEIGHT = chart.wave;

/** Stable, natural-looking bar heights from the URL, so each note keeps its shape. */
function waveShape(seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    h = Math.imul(h ^ (i + 1), 16777619);
    return 0.3 + ((h >>> 0) % 70) / 100;
  });
}

/**
 * WhatsApp-style voice note: a labelled Play / Pause button (never an icon alone),
 * a waveform that fills in as it plays, and the length in minutes:seconds.
 */
export function VoicePlayer({ audioUrl, durationS, speakerName, testID }: VoicePlayerProps) {
  const { t } = useTranslation();
  const { playing, duration, position, toggle } = useVoicePlayer(audioUrl);
  const shape = useMemo(() => waveShape(audioUrl), [audioUrl]);

  const total = duration || durationS || 0;
  const progress = total > 0 ? Math.min(1, position / total) : 0;
  const shown = formatDuration(playing || position > 0 ? total - position : total);

  return (
    <View style={styles.row} testID={testID}>
      <BigButton
        variant={playing ? 'outline' : 'primary'}
        icon={playing ? PauseIcon : PlayIcon}
        label={playing ? t('common.pause') : t('common.play')}
        accessibilityLabel={
          playing
            ? t('common.pause')
            : speakerName
              ? t('voice.playFrom', { name: speakerName })
              : t('common.play')
        }
        labelVariant="bodyStrong"
        fullWidth={false}
        onPress={toggle}
        testID={testID && `${testID}-toggle`}
      />
      <View style={styles.wave} accessible={false} importantForAccessibility="no-hide-descendants">
        {shape.map((height, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: Math.round(height * WAVE_HEIGHT),
                backgroundColor: i / BAR_COUNT < progress ? color.primary : color.borderStrong,
              },
            ]}
          />
        ))}
      </View>
      <Text
        color="textSecondary"
        accessibilityLabel={t('voice.length', { duration: shown })}
        style={styles.time}
      >
        {shown}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  wave: {
    flex: 1,
    height: WAVE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: columnWidth.time,
  },
  bar: {
    width: chart.waveBar,
  },
  time: {
    fontVariant: ['tabular-nums'],
  },
});
