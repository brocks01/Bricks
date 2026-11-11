import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Screen, Text } from '@/components';

/**
 * Where the browser returns after Google sign-in. The sign-in screen finishes
 * the job itself; on Android the same link also opens this route, so it simply
 * steps back to where they were.
 */
export default function AuthCallbackScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  return (
    <Screen back={false} showHelp={false} tellMe={false} testID="screen-auth-callback">
      <Text>{t('common.loading')}</Text>
    </Screen>
  );
}
