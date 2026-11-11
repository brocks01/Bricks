import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useMe, useSafeCircle, useUpdateMe } from '@/api';
import { resetMockDb } from '@/api/mock';
import type { ChannelPref } from '@/api/types';
import {
  Avatar,
  BigButton,
  Chip,
  ChipGroup,
  ConfirmSheet,
  GroupedList,
  GroupedRow,
  HeartbeatIcon,
  LockIcon,
  Screen,
  ShieldCheckIcon,
  SignOutIcon,
  SpeakerHighIcon,
  StatusBanner,
  Text,
  TranslateIcon,
  CaretRightIcon,
  UserCircleIcon,
  UsersThreeIcon,
} from '@/components';
import { signOutOfSupabase } from '@/features/auth/google';
import { useReadOut } from '@/features/readout/ReadOutProvider';
import { CHANNEL_ICON, CHANNELS } from '@/features/settings/channels';
import { LANGUAGE_INFO } from '@/i18n/languages';
import { useActiveLanguage } from '@/i18n/useActiveLanguage';
import { config } from '@/lib/config';
import { DEMO_ALERT_DELAY_S, scheduleDemoAlert } from '@/lib/notifications';
import { useOnboarding } from '@/state/onboarding';
import { useSettings } from '@/state/settings';
import { useUndo } from '@/state/undo';
import { color, iconSize, radius, shadow, space } from '@/theme';

/** Reading speeds offered (expo-speech rates). "Normal" is already slow and clear. */
const SPEEDS = [
  { key: 'slowest', rate: 0.6 },
  { key: 'slow', rate: 0.75 },
  { key: 'normal', rate: 0.85 },
  { key: 'quick', rate: 1 },
] as const;

/** The offered speed nearest to the current rate ("Slower" can land in between). */
function nearestSpeed(rate: number) {
  return SPEEDS.reduce((best, s) =>
    Math.abs(s.rate - rate) < Math.abs(best.rate - rate) ? s : best,
  );
}

/**
 * S40 Settings (SGDS / LifeSG lists): Language · Read aloud · How we remind you
 * · Safe Circle · Family · Sign out. Simple Mode, Health Card and Privacy are
 * shown greyed out as "Coming soon" so families know they're on the way.
 */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const client = useQueryClient();
  const language = useActiveLanguage();
  const { data: me } = useMe();
  const safeCircle = useSafeCircle();
  const updateMe = useUpdateMe();
  const showUndo = useUndo((s) => s.show);
  const { speak, missingVoice } = useReadOut();
  const autoRead = useSettings((s) => s.readOut.autoRead);
  const setAutoRead = useSettings((s) => s.setAutoRead);
  const rate = useSettings((s) => s.readOut.rate);
  const setRate = useSettings((s) => s.setReadOutRate);
  const resetOnboarding = useOnboarding((s) => s.reset);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [demoNote, setDemoNote] = useState<string | null>(null);

  const demoAlert = async (kind: 'are_you_ok' | 'sos_alert') => {
    const scheduled = await scheduleDemoAlert(kind).catch(() => false);
    setDemoNote(
      scheduled
        ? t('settings.demoScheduled', { seconds: DEMO_ALERT_DELAY_S })
        : t('settings.demoNoNotifications'),
    );
  };

  const speed = nearestSpeed(rate);
  const channel = me?.channel_pref ?? 'app';
  const count = safeCircle.data?.length ?? 0;

  const setChannel = (next: ChannelPref) => {
    if (next === channel) return;
    const before = channel;
    updateMe.mutate({ channel_pref: next });
    showUndo(t('settings.channelChanged', { channel: t(`channel.${next}.title`) }), () =>
      updateMe.mutate({ channel_pref: before }),
    );
  };

  const signOut = () => {
    setConfirmSignOut(false);
    void signOutOfSupabase();
    // On mock data, signing out also starts the demo again from fresh data.
    if (config.demoVoice) resetMockDb();
    client.clear();
    resetOnboarding();
    router.dismissAll();
    router.replace('/onboarding');
  };

  return (
    <Screen
      title={t('settings.title')}
      readOut={() =>
        t('settings.readout', {
          language: LANGUAGE_INFO[language].nativeName,
          channel: t(`channel.${channel}.title`),
        })
      }
      testID="screen-settings"
    >
      {/* Luma settings: who you are first, then grouped rows. */}
      {me ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${me.name}. ${t('settings.viewProfile')}`}
          onPress={() => router.push('/profile')}
          style={({ pressed }) => [styles.me, pressed && styles.mePressed]}
          testID="settings-profile"
        >
          <Avatar name={me.name} size={64} />
          <View style={styles.flex}>
            <Text variant="heading">{me.name}</Text>
            <Text color="textSecondary">{t('settings.viewProfile')}</Text>
          </View>
          <CaretRightIcon size={iconSize.inline} color={color.textSecondary} weight="bold" />
        </Pressable>
      ) : null}

      <GroupedList title={t('settings.you')}>
        <GroupedRow
          icon={TranslateIcon}
          tint="exercise"
          title={t('settings.language')}
          value={LANGUAGE_INFO[language].nativeName}
          onPress={() => router.push('/settings/language')}
          testID="settings-language"
        />
      </GroupedList>

      <Text variant="heading" style={styles.heading}>
        {t('settings.readAloud')}
      </Text>
      <Text>{t('settings.autoRead')}</Text>
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
      <Text>{t('settings.speed')}</Text>
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

      <Text variant="heading" style={styles.heading}>
        {t('settings.remindTitle')}
      </Text>
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

      <View style={styles.groups}>
        <GroupedList title={t('settings.people')}>
          <GroupedRow
            icon={ShieldCheckIcon}
            tint="walk"
            title={t('settings.safeCircle')}
            value={count > 0 ? t('settings.peopleCount', { count }) : t('settings.nobodyYet')}
            onPress={() => router.push('/settings/safe-circle')}
            testID="settings-safe-circle"
          />
          <GroupedRow
            icon={UsersThreeIcon}
            tint="meetup"
            title={t('settings.family')}
            onPress={() => router.push('/family')}
            testID="settings-family"
          />
        </GroupedList>

        {/* Not ready yet: plain rows that say so, never buttons that do nothing. */}
        <GroupedList>
          <GroupedRow
            icon={UserCircleIcon}
            title={t('settings.simpleMode')}
            subtitle={t('common.comingSoon')}
          />
          <GroupedRow
            icon={HeartbeatIcon}
            title={t('settings.healthCard')}
            subtitle={t('common.comingSoon')}
          />
          <GroupedRow
            icon={LockIcon}
            title={t('settings.privacy')}
            subtitle={t('common.comingSoon')}
          />
        </GroupedList>

        <GroupedList>
          <GroupedRow
            icon={SignOutIcon}
            title={t('settings.signOut')}
            onPress={() => setConfirmSignOut(true)}
            testID="settings-sign-out"
          />
        </GroupedList>
      </View>

      {config.demoVoice ? (
        // Demo only (mock data): the alerts the server sends, so S29 / S30 can be tried on one phone.
        <View style={styles.rows} testID="settings-demo">
          <Text variant="heading" style={styles.heading}>
            {t('settings.demoHeading')}
          </Text>
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
          {demoNote ? (
            <StatusBanner tone="info" text={demoNote} testID="settings-demo-note" />
          ) : null}
        </View>
      ) : null}

      <ConfirmSheet
        visible={confirmSignOut}
        icon={SignOutIcon}
        text={config.demoVoice ? t('settings.signOutConfirmDemo') : t('settings.signOutConfirm')}
        onYes={signOut}
        onNo={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  me: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.card,
    backgroundColor: color.bg,
    ...shadow.card,
  },
  mePressed: {
    backgroundColor: color.primarySubtle,
  },
  flex: {
    flex: 1,
  },
  groups: {
    gap: space.lg,
    marginTop: space.md,
  },
  heading: {
    marginTop: space.md,
  },
  rows: {
    gap: space.sm,
  },
});
