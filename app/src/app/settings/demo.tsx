import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BigButton, Chip, ChipGroup, Screen, StatusBanner, Text } from '@/components';
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
    <Screen section="settings" title={t('settings.demoHeading')} testID="settings-demo">
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
    </Screen>
  );
}
