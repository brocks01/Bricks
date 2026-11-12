import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useSaveIntro, useSetSafeCircle, useUpdateMe } from '@/api';
import type { ChannelPref } from '@/api/types';
import { BigButton, Screen, SectionCard, StatusBanner } from '@/components';
import { useResumeHere } from '@/features/onboarding/useResumeHere';
import { CHANNEL_ICON, CHANNELS } from '@/features/settings/channels';
import { useActiveLanguage } from '@/i18n/useActiveLanguage';
import { notificationsAllowed } from '@/lib/notifications';
import { useOnboarding } from '@/state/onboarding';
import { space } from '@/theme';

/**
 * S7 Reminder channel (Airbnb choice cards): App notification · WhatsApp message
 * · Phone call. Choosing one saves everything from onboarding in one go, then
 * shows All set. "Later" keeps app notifications.
 */
export default function ChannelScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useActiveLanguage();
  const draft = useOnboarding((s) => s.draft);
  const updateMe = useUpdateMe({ quiet: true });
  const setSafeCircle = useSetSafeCircle();
  const saveIntro = useSaveIntro();
  const [saving, setSaving] = useState<ChannelPref | null>(null);
  const [failed, setFailed] = useState(false);
  useResumeHere('/onboarding/reminders');

  const finish = async (channel: ChannelPref) => {
    setSaving(channel);
    setFailed(false);
    try {
      const name = draft.name.trim() || draft.preferredName.trim();
      await updateMe.mutateAsync({
        ...(name ? { name } : {}),
        preferred_name: draft.preferredName.trim() || null,
        area_name: draft.area.trim() || null,
        interests: draft.interests,
        channel_pref: channel,
        language,
      });
      if (draft.safeCircle.length > 0) await setSafeCircle.mutateAsync(draft.safeCircle);
      if (draft.intro) {
        await saveIntro.mutateAsync({
          audio_uri: draft.intro.uri,
          duration_s: draft.intro.durationS,
        });
      }
      // App notifications need the phone's permission: ask now, right after they chose them.
      if (channel === 'app') await notificationsAllowed(true).catch(() => false);
      router.push('/onboarding/done');
    } catch {
      setFailed(true);
    } finally {
      setSaving(null);
    }
  };

  return (
    <Screen
      title={t('onboarding.channel.title')}
      readOut={() => t('onboarding.channel.readout')}
      testID="screen-onboarding-channel"
      footer={
        <BigButton
          variant="outline"
          label={t('onboarding.later')}
          disabled={saving !== null}
          onPress={() => void finish('app')}
          testID="channel-later"
        />
      }
    >
      <View style={styles.cards}>
        {CHANNELS.map((channel) => (
          <SectionCard
            key={channel}
            icon={CHANNEL_ICON[channel]}
            title={t(`channel.${channel}.title`)}
            description={t(`channel.${channel}.description`)}
            selected={saving === channel}
            disabled={saving !== null && saving !== channel}
            onPress={() => void finish(channel)}
            testID={`channel-${channel}`}
          />
        ))}
      </View>
      {failed ? <StatusBanner tone="notice" text={t('common.error')} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cards: {
    gap: space.sm,
  },
});
