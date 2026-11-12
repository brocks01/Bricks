import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useLastCheckinResult, useToday } from '@/api';
import { BigButton, QueryState, Screen, StatusBanner } from '@/components';
import { CheckinFlow } from '@/features/checkin/CheckinFlow';

/**
 * S21 Good Morning Check-in as its own screen: where the morning reminder
 * notification opens. Same flow as on Home, plus "Maybe later" and a way back.
 */
export default function CheckinScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  // Opened from the 8 am notification: read the question out straight away (S38).
  const { read } = useLocalSearchParams<{ read?: string }>();
  const today = useToday();
  const answered = useLastCheckinResult();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/thrive'));

  return (
    <Screen
      section="health"
      title={t('checkin.title')}
      readOut={() => t('checkin.readout', { question: t('home.checkin.question') })}
      readOnOpen={read === '1'}
      testID="screen-checkin"
      footer={
        answered || today.data?.checkin.pending === false ? (
          <BigButton label={t('common.done')} onPress={close} testID="checkin-done" />
        ) : undefined
      }
    >
      <QueryState query={today}>
        {(data) =>
          data.checkin.pending || answered ? (
            <CheckinFlow pending={data.checkin.pending} onMaybeLater={close} />
          ) : (
            <StatusBanner tone="success" text={t('checkin.alreadyAnswered')} />
          )
        }
      </QueryState>
    </Screen>
  );
}
