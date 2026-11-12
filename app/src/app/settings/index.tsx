import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useMe, useSafeCircle, useUpdateMe } from '@/api';
import { resetMockDb } from '@/api/mock';
import {
  BellIcon,
  ArrowCounterClockwiseIcon,
  BigButton,
  ConfirmSheet,
  GroupedList,
  GroupedRow,
  showToast,
  Screen,
  ShieldCheckIcon,
  SignOutIcon,
  SpeakerHighIcon,
  SquaresFourIcon,
  Text,
  TextAaIcon,
  TranslateIcon,
  UserCircleIcon,
  UsersThreeIcon,
  WrenchIcon,
} from '@/components';
import { signOutOfSupabase } from '@/features/auth/google';
import { useDemoReset } from '@/features/settings/demoControls';
import { nearestSpeed } from '@/features/settings/speeds';
import { LANGUAGE_INFO } from '@/i18n/languages';
import { useActiveLanguage } from '@/i18n/useActiveLanguage';
import { config } from '@/lib/config';
import { useOnboarding } from '@/state/onboarding';
import { useSettings } from '@/state/settings';
import { space } from '@/theme';

/**
 * S40 Settings (SGDS / LifeSG lists), on one screen: who you are, then one row per
 * setting, each opening its own short page: Language · Text size · Read aloud ·
 * How we remind you · Safe Circle · Family · Sign out. (Simple Mode, Health Card
 * and Privacy are not built yet, so they aren't listed.)
 */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const client = useQueryClient();
  const language = useActiveLanguage();
  const { data: me } = useMe();
  const safeCircle = useSafeCircle();
  const textSize = useSettings((s) => s.textSize);
  const rate = useSettings((s) => s.readOut.rate);
  const resetOnboarding = useOnboarding((s) => s.reset);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSimple, setConfirmSimple] = useState(false);
  const updateMe = useUpdateMe();
  const reset = useDemoReset();
  // Hidden demo controls: tap the version 5 times (the stage demo, judges' phones).
  const [demoUnlocked, setDemoUnlocked] = useState(false);
  const taps = useRef<number[]>([]);
  const showDemo = demoUnlocked || config.demoVoice || config.devTools;

  const tapVersion = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((at) => now - at < UNLOCK_WINDOW_MS), now];
    if (taps.current.length >= UNLOCK_TAPS && !demoUnlocked) {
      setDemoUnlocked(true);
      showToast(t('settings.demoUnlocked'));
    }
  };

  const channel = me?.channel_pref ?? 'app';
  const count = safeCircle.data?.length;

  const signOut = () => {
    setConfirmSignOut(false);
    void signOutOfSupabase();
    // On mock data, signing out also starts the demo again from fresh data.
    if (config.demoVoice) resetMockDb();
    client.clear();
    resetOnboarding();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/onboarding');
  };

  return (
    <Screen
      section="settings"
      title={t('settings.title')}
      readOut={() =>
        t('settings.readout', {
          language: LANGUAGE_INFO[language].nativeName,
          channel: t(`channel.${channel}.title`),
        })
      }
      testID="screen-settings"
    >
      {/* Luma settings: who you are first, then one row per setting. */}
      <GroupedList>
        {me ? (
          <GroupedRow
            icon={UserCircleIcon}
            tint="games"
            title={me.name}
            value={t('settings.profile')}
            onPress={() => router.push('/profile')}
            testID="settings-profile"
          />
        ) : null}
        <GroupedRow
          icon={TranslateIcon}
          tint="exercise"
          title={t('settings.language')}
          value={LANGUAGE_INFO[language].nativeName}
          onPress={() => router.push('/settings/language')}
          testID="settings-language"
        />
        <GroupedRow
          icon={TextAaIcon}
          tint="class"
          title={t('textSize.title')}
          value={t(`textSize.${textSize}`)}
          onPress={() => router.push('/settings/text-size')}
          testID="settings-text-size"
        />
        <GroupedRow
          icon={SquaresFourIcon}
          tint="kids"
          title={t('simple.title')}
          value={me ? t(me.simple_mode ? 'simple.on' : 'simple.off') : undefined}
          onPress={me ? () => setConfirmSimple(true) : undefined}
          testID="settings-simple-mode"
        />
        <GroupedRow
          icon={SpeakerHighIcon}
          tint="games"
          title={t('settings.readAloud')}
          value={t(`settings.speeds.${nearestSpeed(rate).key}`)}
          onPress={() => router.push('/settings/read-aloud')}
          testID="settings-read-aloud"
        />
        <GroupedRow
          icon={BellIcon}
          tint="music"
          title={t('settings.remindShort')}
          value={me ? t(`channel.${channel}.short`) : undefined}
          onPress={() => router.push('/settings/reminders')}
          testID="settings-reminders"
        />
      </GroupedList>

      <GroupedList>
        <GroupedRow
          icon={ShieldCheckIcon}
          tint="walk"
          title={t('settings.safeCircle')}
          value={
            // Nothing until it has loaded: never "Nobody yet" for a circle that exists.
            count === undefined
              ? undefined
              : count > 0
                ? t('settings.peopleCount', { count })
                : t('settings.nobodyYet')
          }
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
        {demoUnlocked ? (
          <GroupedRow
            icon={ArrowCounterClockwiseIcon}
            title={t('settings.resetDemo')}
            onPress={() => setConfirmReset(true)}
            testID="settings-reset-demo"
          />
        ) : null}
      </GroupedList>

      {/* Sign out, the version (tap 5 times for demo controls) and, on demo builds, Demo:
          small, below the member's own settings (Luma). */}
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="text"
          onPress={tapVersion}
          style={styles.version}
          testID="settings-version"
        >
          <Text variant="caption" color="textSecondary" align="center">
            {t('settings.version', { version: APP_VERSION })}
          </Text>
        </Pressable>
        <BigButton
          variant="outline"
          fullWidth={false}
          icon={SignOutIcon}
          label={t('settings.signOut')}
          labelVariant="bodyStrong"
          onPress={() => setConfirmSignOut(true)}
          testID="settings-sign-out"
        />
        {showDemo ? (
          <BigButton
            variant="outline"
            fullWidth={false}
            icon={WrenchIcon}
            label={t('settings.demoHeading')}
            labelVariant="bodyStrong"
            onPress={() => router.push('/settings/demo')}
            testID="settings-demo-open"
          />
        ) : null}
      </View>

      <ConfirmSheet
        visible={confirmSimple}
        icon={SquaresFourIcon}
        text={t(me?.simple_mode ? 'simple.confirmOff' : 'simple.confirmOn')}
        onYes={() => {
          setConfirmSimple(false);
          const on = !me?.simple_mode;
          updateMe.mutate(
            { simple_mode: on },
            {
              onSuccess: () => {
                showToast(t(on ? 'simple.turnedOn' : 'simple.turnedOff'));
                if (on) router.navigate('/home');
              },
            },
          );
        }}
        onNo={() => setConfirmSimple(false)}
      />
      <ConfirmSheet
        visible={confirmReset}
        icon={ArrowCounterClockwiseIcon}
        text={reset.isError ? t('settings.resetFailed') : t('settings.resetDemoConfirm')}
        onYes={() => reset.mutate(undefined, { onSuccess: () => setConfirmReset(false) })}
        onNo={() => setConfirmReset(false)}
      />
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

const APP_VERSION = Constants.expoConfig?.version ?? '';
const UNLOCK_TAPS = 5;
const UNLOCK_WINDOW_MS = 4000;

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  version: {
    alignSelf: 'center',
    paddingVertical: space.xxs,
    paddingHorizontal: space.sm,
  },
});
