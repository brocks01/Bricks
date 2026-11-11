import { BottomSheet } from './BottomSheet';
import { QuestionIcon, type Icon } from './primitives/icons';
import { SheetHeader } from './SheetHeader';
import { YesNo } from './YesNo';

export interface ConfirmSheetProps {
  visible: boolean;
  /** One plain question: "Every day at 8 am: take medicine. Is that right?" */
  text: string;
  /** One more line under the question, when it helps. */
  detail?: string;
  icon?: Icon;
  onYes: () => void;
  onNo: () => void;
  yesLabel?: string;
  noLabel?: string;
}

/**
 * Confirms a change before it happens (Monzo): the request read back in plain
 * words under a SheetHeader, then Yes / No. The Android back button counts as No.
 */
export function ConfirmSheet({
  visible,
  text,
  detail,
  icon = QuestionIcon,
  onYes,
  onNo,
  yesLabel,
  noLabel,
}: ConfirmSheetProps) {
  return (
    <BottomSheet visible={visible} onRequestClose={onNo} testID="confirm-sheet">
      <SheetHeader icon={icon} title={text} text={detail} />
      <YesNo onYes={onYes} onNo={onNo} yesLabel={yesLabel} noLabel={noLabel} testID="confirm" />
    </BottomSheet>
  );
}
