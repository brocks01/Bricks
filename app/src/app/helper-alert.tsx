import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { ApiError, useRespondSos } from '@/api';
import { BigButton, PhoneIcon, RouteMap, Screen, StatusBanner, Text } from '@/components';
import { config } from '@/lib/config';
import { formatTime } from '@/lib/format';
import { warningFeedback } from '@/lib/haptics';
import { platform } from '@/lib/platform';
import { mapHeight, space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

type Params = {
  /** The alert's id. */
  sos?: string;
  name?: string;
  phone?: string;
  lat?: string;
  lng?: string;
  /** When they asked for help (ISO 8601). */
  at?: string;
};

/**
 * S30 Helper alert (Be My Eyes incoming call): the receiving side of SOS, opened
 * from the high-priority push. Everything shown comes with the push (helpers
 * can't look up someone else's alert): who, where, when.
 * - I'm on my way (primary) → the member's S28 shows it within seconds.
 * - Call {name} (tel:) and a "Call 995" link.
 */
export default function HelperAlertScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const respond = useRespondSos();

  const name = params.name?.trim() || t('safety.helper.someone');
  const firstName = name.split(' ')[0]!;
  const phone = params.phone?.trim() || null;
  const lat = Number(params.lat);
  const lng = Number(params.lng);
  const where = params.lat && params.lng && Number.isFinite(lat) && Number.isFinite(lng);
  const at = params.at ? new Date(params.at) : null;
  const time = at && !Number.isNaN(at.getTime()) ? formatTime(at, language) : null;

  const sent = respond.isSuccess;
  // 404: the alert is over (they're safe, or it was cancelled) or not for this member.
  const closed = respond.error instanceof ApiError && respond.error.status === 404;
  const number = config.emergencyNumber;

  useEffect(() => warningFeedback(), []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));
  const dial = (to: string) => void Linking.openURL(`tel:${to}`).catch(() => {});
  const onWay = () => {
    if (params.sos) respond.mutate({ id: params.sos, status: 'on_way' });
  };

  const readOut = () =>
    sent
      ? t('safety.helper.sent', { name: firstName })
      : t('safety.helper.readout', {
          name,
          time: time ?? t('safety.helper.justNow'),
        });

  return (
    <Screen
      title={t('safety.helper.title', { name: firstName })}
      readOut={readOut}
      readOnOpen
      back={false}
      showHelp={false}
      standalone
      testID="screen-helper-alert"
      footer={
        sent || closed ? (
          <BigButton label={t('common.done')} onPress={close} testID="helper-done" />
        ) : null
      }
    >
      <Text variant="display">{t('safety.helper.title', { name: firstName })}</Text>
      {time ? <Text testID="helper-when">{t('safety.helper.when', { time })}</Text> : null}

      {where ? (
        <RouteMap
          points={[{ lat, lng }]}
          label={t('safety.helper.mapLabel', { name: firstName })}
          height={mapHeight.sm}
          testID="helper-map"
        />
      ) : (
        <StatusBanner tone="notice" text={t('safety.helper.noLocation', { name: firstName })} />
      )}

      {sent ? (
        <StatusBanner
          tone="success"
          text={t('safety.helper.sent', { name: firstName })}
          testID="helper-sent"
        />
      ) : closed ? (
        <StatusBanner
          tone="info"
          text={t('safety.helper.closed', { name: firstName })}
          testID="helper-closed"
        />
      ) : (
        <BigButton
          size="xl"
          label={t('safety.helper.onWay')}
          onPress={onWay}
          disabled={respond.isPending || !params.sos}
          testID="helper-on-way"
        />
      )}
      {respond.isError && !closed ? (
        <StatusBanner
          tone="notice"
          text={t('safety.helper.failed', { name: firstName })}
          testID="helper-failed"
        />
      ) : null}

      <View style={styles.calls}>
        {phone ? (
          <BigButton
            variant="outline"
            size="lg"
            icon={PhoneIcon}
            label={t('safety.helper.call', { name: firstName })}
            onPress={() => dial(phone)}
            disabled={!platform.canCallPhone}
            testID="helper-call"
          />
        ) : null}
        <BigButton
          variant="outline"
          label={t('sos.call', { number })}
          onPress={() => dial(number)}
          disabled={!platform.canCallPhone}
          testID="helper-call-995"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  calls: {
    gap: space.sm,
    marginTop: space.sm,
  },
});
