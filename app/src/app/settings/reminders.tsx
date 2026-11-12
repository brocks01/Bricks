import { useTranslation } from 'react-i18next';

import { useMe, useUpdateMe } from '@/api';
import type { ChannelPref } from '@/api/types';
import { Chip, ChipGroup, Screen, Text } from '@/components';
import { CHANNEL_ICON, CHANNELS } from '@/features/settings/channels';
import { useUndo } from '@/state/undo';

/** Settings → How we remind you: app, WhatsApp or a phone call, with Undo. */
export default function RemindChannelScreen() {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const updateMe = useUpdateMe();
  const showUndo = useUndo((s) => s.show);
  const channel = me?.channel_pref ?? 'app';

  const setChannel = (next: ChannelPref) => {
    if (next === channel) return;
    const before = channel;
    updateMe.mutate({ channel_pref: next });
    showUndo(t('settings.channelChanged', { channel: t(`channel.${next}.title`) }), () =>
      updateMe.mutate({ channel_pref: before }),
    );
  };

  return (
    <Screen
      section="settings"
      title={t('settings.remindTitle')}
      readOut={() =>
        `${t('settings.remindTitle')}. ${t(`channel.${channel}.title`)}. ${t(`channel.${channel}.description`)}`
      }
      testID="screen-settings-reminders"
    >
      <ChipGroup>
        {CHANNELS.map((c) => (
          <Chip
            key={c}
            icon={CHANNEL_ICON[c]}
            label={t(`channel.${c}.title`)}
            selected={channel === c}
            onPress={() => setChannel(c)}
            testID={`settings-channel-${c}`}
          />
        ))}
      </ChipGroup>
      <Text color="textSecondary">{t(`channel.${channel}.description`)}</Text>
    </Screen>
  );
}
