import { BottomSheet } from './BottomSheet';
import { Text } from './primitives/Text';
import { YesNo } from './YesNo';

export interface ConfirmSheetProps {
  visible: boolean;
  /** One plain question: "Every day at 8 am: take medicine. Is that right?" */
  text: string;
  onYes: () => void;
  onNo: () => void;
  yesLabel?: string;
  noLabel?: string;
}

/**
 * Confirms a change before it happens (Monzo): the request read back in plain
 * words, then Yes / No. The Android back button counts as No.
 */
export function ConfirmSheet({ visible, text, onYes, onNo, yesLabel, noLabel }: ConfirmSheetProps) {
  return (
    <BottomSheet visible={visible} onRequestClose={onNo} testID="confirm-sheet">
      <Text variant="heading" accessibilityLiveRegion="polite">
        {text}
      </Text>
      <YesNo onYes={onYes} onNo={onNo} yesLabel={yesLabel} noLabel={noLabel} testID="confirm" />
    </BottomSheet>
  );
}
