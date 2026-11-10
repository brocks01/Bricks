import { useTranslation } from 'react-i18next';

import { Screen } from '@/components';
import { ComingSoon } from '@/components/ComingSoon';

/** S20 Thrive. Built in iteration 1.2. */
export default function ThriveScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('thrive.title')} readOut={() => t('thrive.readout')} testID="screen-thrive">
      <ComingSoon text={t('thrive.comingSoon')} />
    </Screen>
  );
}
