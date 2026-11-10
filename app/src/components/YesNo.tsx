import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { space } from '@/theme';
import { useEffectiveFontScale } from '@/theme/TypographyProvider';

import { BigButton } from './BigButton';
import { CheckIcon, XIcon } from './primitives/icons';

export interface YesNoProps {
  onYes: () => void;
  onNo: () => void;
  yesLabel?: string;
  noLabel?: string;
  testID?: string;
}

/** Above this text size the two buttons stack, so neither label gets squeezed. */
export const YES_NO_STACK_SCALE = 1.5;

/**
 * Two clear answers side by side (Monzo). Yes is green; No is a calm outline,
 * never red: saying no is never "wrong" (docs/02 rule 9).
 */
export function YesNo({ onYes, onNo, yesLabel, noLabel, testID }: YesNoProps) {
  const { t } = useTranslation();
  const stacked = useEffectiveFontScale() >= YES_NO_STACK_SCALE;

  return (
    <View style={[styles.row, stacked && styles.stacked]} testID={testID}>
      <View style={styles.cell}>
        <BigButton
          variant="success"
          icon={CheckIcon}
          label={yesLabel ?? t('common.yes')}
          onPress={onYes}
          testID={testID && `${testID}-yes`}
        />
      </View>
      <View style={styles.cell}>
        <BigButton
          variant="outline"
          icon={XIcon}
          label={noLabel ?? t('common.no')}
          onPress={onNo}
          testID={testID && `${testID}-no`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.sm,
  },
  stacked: {
    flexDirection: 'column',
  },
  cell: {
    flexGrow: 1,
    flexBasis: 0,
  },
});
