import { useTranslation } from 'react-i18next';

import { Text } from './primitives/Text';

/**
 * "Step 2 of 3" in words (Airbnb flow, without its thin progress bar, which is
 * hard to see and means nothing when read aloud).
 */
export function StepProgress({ step, total }: { step: number; total: number }) {
  const { t } = useTranslation();
  return (
    <Text
      variant="bodyStrong"
      color="textSecondary"
      accessibilityRole="text"
      testID="step-progress"
    >
      {t('step.progress', { step, total })}
    </Text>
  );
}
