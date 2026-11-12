import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useEvents, useMe, useToday } from '@/api';
import { BigButton, QueryState, Screen } from '@/components';
import { TodaySection } from '@/features/home/TodaySection';
import { useHomeReadout } from '@/features/home/useHomeReadout';
import { YourEvents } from '@/features/home/YourEvents';
import { ReadOutTarget } from '@/features/readout/ReadOutTarget';

/**
 * Simple Mode → Today (S13): the day's plan, read out as soon as it opens, with the
 * check-in to answer Yes or No right here. One button back to Home.
 */
export default function TodayScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: me } = useMe();
  const today = useToday();
  const events = useEvents(null);
  const readOut = useHomeReadout();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <Screen
      section="home"
      title={t('simple.today')}
      readOut={readOut}
      readOnOpen
      testID="screen-today"
      footer={<BigButton label={t('common.done')} onPress={close} testID="today-done" />}
    >
      <ReadOutTarget id="today">
        <QueryState query={today} loadingText={t('home.loading')}>
          {(data) => <TodaySection today={data} />}
        </QueryState>
      </ReadOutTarget>
      <QueryState query={events}>{(list) => <YourEvents events={list} meId={me?.id} />}</QueryState>
    </Screen>
  );
}
