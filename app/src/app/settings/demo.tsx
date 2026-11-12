import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useDemoAccounts } from '@/api';
import {
  ArrowCounterClockwiseIcon,
  BigButton,
  Chip,
  ChipGroup,
  ConfirmSheet,
  Screen,
  StatusBanner,
  Text,
  WifiHighIcon,
} from '@/components';
import {
  DEMO_SENIOR,
  useConnectionCheck,
  useDemoReset,
  useSwitchDemoAccount,
} from '@/features/settings/demoControls';
import { useSettings } from '@/state/settings';
import { useActiveWalk } from '@/features/walk/activeWalk';
import { config } from '@/lib/config';
import { DEMO_ALERT_DELAY_S, scheduleDemoAlert } from '@/lib/notifications';
import { platform } from '@/lib/platform';

/**
 * Settings → Demo (demo and developer builds only, never in store builds): the
 * alerts the server sends, so S29 / S30 can be tried on one phone; and for
 * developers, the walk source (real GPS or a simulated walk) and the component
 * gallery.
 */
export default function DemoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [note, setNote] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const reset = useDemoReset();
  const accounts = useDemoAccounts(true);
  const switchTo = useSwitchDemoAccount();
  const actingAs = useSettings((s) => s.demoUser) ?? DEMO_SENIOR;
  const connection = useConnectionCheck();
  const walkSource = useActiveWalk((s) => s.source);
  const setWalkSource = useActiveWalk((s) => s.setSource);
  const simulationSpeed = useActiveWalk((s) => s.simulationSpeed);
  const setSimulationSpeed = useActiveWalk((s) => s.setSimulationSpeed);

  const demoAlert = async (kind: 'are_you_ok' | 'sos_alert') => {
    const scheduled = await scheduleDemoAlert(kind).catch(() => false);
    setNote(
      scheduled
        ? t('settings.demoScheduled', { seconds: DEMO_ALERT_DELAY_S })
        : t('settings.demoNoNotifications'),
    );
  };

  return (
    <Screen
      section="settings"
      title={t('settings.demoHeading')}
      readOut={() => t('settings.demoReadout')}
      testID="settings-demo"
    >
      <BigButton
        variant="outline"
        icon={ArrowCounterClockwiseIcon}
        label={t('settings.resetDemo')}
        onPress={() => setConfirmReset(true)}
        testID="demo-reset"
      />
      {/* At the venue: is this network good enough (venue Wi-Fi or the hotspot)? */}
      <BigButton
        variant="outline"
        icon={WifiHighIcon}
        label={t('settings.checkConnection')}
        disabled={connection.isPending}
        onPress={() => connection.mutate()}
        testID="demo-check-connection"
      />
      {connection.isError ? (
        <StatusBanner
          tone="notice"
          text={t('settings.connectionFailed')}
          testID="demo-connection"
        />
      ) : connection.data ? (
        <StatusBanner
          tone={connection.data.database && connection.data.ms < SLOW_MS ? 'success' : 'notice'}
          text={
            !connection.data.database
              ? t('settings.connectionNoDatabase')
              : t(
                  connection.data.ms < SLOW_MS
                    ? 'settings.connectionOk'
                    : 'settings.connectionSlow',
                  {
                    ms: connection.data.ms,
                  },
                )
          }
          testID="demo-connection"
        />
      ) : null}
      {/* Several seeded accounts only on a demo server (mock data is Raj's world). */}
      {accounts.data && accounts.data.length > 1 ? (
        <>
          <Text variant="bodyStrong">{t('settings.actAs')}</Text>
          <ChipGroup>
            {accounts.data.map((a) => (
              <Chip
                key={a.id}
                label={`${a.name.split(' ')[0]} · ${t(`settings.roles.${a.role}`)}`}
                selected={actingAs === a.id}
                onPress={() => void switchTo(a)}
                testID={`demo-account-${a.id}`}
              />
            ))}
          </ChipGroup>
        </>
      ) : null}
      {config.demoVoice ? (
        <>
          <BigButton
            variant="outline"
            label={t('settings.demoAreYouOk')}
            onPress={() => void demoAlert('are_you_ok')}
            testID="settings-demo-are-you-ok"
          />
          <BigButton
            variant="outline"
            label={t('settings.demoHelperAlert')}
            onPress={() => void demoAlert('sos_alert')}
            testID="settings-demo-helper-alert"
          />
          {note ? <StatusBanner tone="info" text={note} testID="settings-demo-note" /> : null}
        </>
      ) : null}
      {config.devTools ? (
        // Developer builds only: English labels, never shown to members.
        <>
          <Text variant="bodyStrong">Walk source</Text>
          <ChipGroup>
            {platform.canRecordGps ? (
              <Chip
                label="Real GPS"
                selected={walkSource === 'gps'}
                onPress={() => setWalkSource('gps')}
                testID="thrive-gps"
              />
            ) : null}
            {([1, 10] as const).map((speed) => (
              <Chip
                key={speed}
                label={`Simulated walk ${speed}×`}
                selected={walkSource === 'simulated' && simulationSpeed === speed}
                onPress={() => {
                  setWalkSource('simulated');
                  setSimulationSpeed(speed);
                }}
                testID={`thrive-sim-${speed}`}
              />
            ))}
          </ChipGroup>
          <BigButton
            variant="outline"
            label="Component gallery"
            onPress={() => router.push('/dev/components')}
            testID="home-dev-gallery"
          />
        </>
      ) : null}
      <ConfirmSheet
        visible={confirmReset}
        icon={ArrowCounterClockwiseIcon}
        text={reset.isError ? t('settings.resetFailed') : t('settings.resetDemoConfirm')}
        onYes={() => reset.mutate(undefined, { onSuccess: () => setConfirmReset(false) })}
        onNo={() => setConfirmReset(false)}
      />
    </Screen>
  );
}

/** Slower than this and the demo will feel stuck: use the hotspot. */
const SLOW_MS = 1500;
