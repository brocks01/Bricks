import { useTranslation } from 'react-i18next';

import { Screen } from '@/components';
import { ComingSoon } from '@/components/ComingSoon';

/** S31 Pass It On. Built in iteration 1.3. */
export default function PassItOnScreen() {
  const { t } = useTranslation();
  return (
    <Screen
      title={t('passItOn.title')}
      readOut={() => t('passItOn.readout')}
      testID="screen-pass-it-on"
    >
      <ComingSoon text={t('passItOn.comingSoon')} />
    </Screen>
  );
}
