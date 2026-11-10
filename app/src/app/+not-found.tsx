import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BigButton, HouseIcon, Screen, Text } from '@/components';

/** Never a dead end: an unknown link always leads back Home. */
export default function NotFoundScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen
      title={t('notFound.title')}
      readOut={() => `${t('notFound.title')}. ${t('notFound.body')}`}
      back={false}
      standalone
      testID="screen-not-found"
      footer={
        <BigButton
          icon={HouseIcon}
          label={t('notFound.action')}
          onPress={() => router.replace('/home')}
        />
      }
    >
      <Text>{t('notFound.body')}</Text>
    </Screen>
  );
}
