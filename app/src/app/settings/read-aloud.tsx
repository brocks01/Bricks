import { useTranslation } from 'react-i18next';

import {
  BigButton,
  Chip,
  ChipGroup,
  Screen,
  SpeakerHighIcon,
  StatusBanner,
  Text,
} from '@/components';
import { useReadOut } from '@/features/readout/ReadOutProvider';
import { nearestSpeed, SPEEDS } from '@/features/settings/speeds';
import { LANGUAGE_INFO } from '@/i18n/languages';
import { useActiveLanguage } from '@/i18n/useActiveLanguage';
import { useSettings } from '@/state/settings';

/** Settings → Read aloud: read each screen when it opens, and how fast. */
export default function ReadAloudScreen() {
  const { t } = useTranslation();
  const language = useActiveLanguage();
  const { speak, missingVoice } = useReadOut();
  const autoRead = useSettings((s) => s.readOut.autoRead);
  const setAutoRead = useSettings((s) => s.setAutoRead);
  const rate = useSettings((s) => s.readOut.rate);
  const setRate = useSettings((s) => s.setReadOutRate);
  const speed = nearestSpeed(rate);

  return (
    <Screen
      section="settings"
      title={t('settings.readAloud')}
      readOut={() =>
        `${t('settings.readAloud')}. ${t('settings.autoRead')} ${t('settings.speed')}.`
      }
      testID="screen-settings-read-aloud"
    >
      <Text variant="bodyStrong">{t('settings.autoRead')}</Text>
      <ChipGroup>
        <Chip
          label={t('common.yes')}
          selected={autoRead}
          onPress={() => setAutoRead(true)}
          testID="settings-autoread-on"
        />
        <Chip
          label={t('common.no')}
          selected={!autoRead}
          onPress={() => setAutoRead(false)}
          testID="settings-autoread-off"
        />
      </ChipGroup>
      <Text variant="bodyStrong">{t('settings.speed')}</Text>
      <ChipGroup>
        {SPEEDS.map((s) => (
          <Chip
            key={s.key}
            label={t(`settings.speeds.${s.key}`)}
            selected={speed.key === s.key}
            onPress={() => {
              setRate(s.rate);
              speak(t('settings.speedSample'));
            }}
            testID={`settings-speed-${s.key}`}
          />
        ))}
      </ChipGroup>
      <BigButton
        variant="outline"
        icon={SpeakerHighIcon}
        label={t('settings.tryVoice')}
        onPress={() => speak(t('settings.speedSample'))}
        testID="settings-try-voice"
      />
      {missingVoice ? (
        <StatusBanner
          tone="notice"
          text={t('settings.missingVoice', { language: LANGUAGE_INFO[language].nativeName })}
          testID="settings-missing-voice"
        />
      ) : null}
    </Screen>
  );
}
