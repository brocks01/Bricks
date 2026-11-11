import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useSignIn } from '@/api';
import type { SignInMethod } from '@/api/types';
import {
  BigButton,
  DeviceMobileIcon,
  GoogleLogoIcon,
  IdentificationCardIcon,
  Screen,
  ShieldCheckIcon,
  StatusBanner,
  Text,
  TextField,
} from '@/components';
import { signInWithGoogle } from '@/features/auth/google';
import { useResumeHere } from '@/features/onboarding/useResumeHere';
import { config } from '@/lib/config';
import { isSingaporeMobile, normalisePhone } from '@/lib/phone';
import { useOnboarding } from '@/state/onboarding';
import { color, iconSize, space } from '@/theme';

/** "Raj Kumar" → "Raj": what we call them unless they choose otherwise. */
const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

/**
 * S3 Sign in (Singpass / LifeSG): Singpass first (it fills in their name and
 * area), then Google and phone number as equal big buttons. No passwords.
 * Google is real when Supabase is set up (browser sign-in, works in Expo Go);
 * Singpass stays a mock for the hackathon. Phone-number sign-in shows only once
 * an SMS provider is configured. On mock data the screen says what's a demo.
 */
export default function SignInScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const path = useOnboarding((s) => s.path);
  const draft = useOnboarding((s) => s.draft);
  const updateDraft = useOnboarding((s) => s.updateDraft);
  const signIn = useSignIn();
  const [phoneMode, setPhoneMode] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [googleFailed, setGoogleFailed] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  useResumeHere('/onboarding/sign-in');
  const realGoogle = config.supabase !== null;
  const showPhone = !realGoogle || config.phoneSignIn;
  const busy = signIn.isPending || googleBusy;

  const go = async (method: SignInMethod, signedInName: string | null = null) => {
    try {
      const result = await signIn.mutateAsync({
        method,
        phone: phone ? normalisePhone(phone) : undefined,
      });
      // The name on their Google account beats anything prefilled.
      const name = signedInName ?? result.prefill.name ?? draft.name;
      updateDraft({
        name,
        preferredName: draft.preferredName || firstName(name),
        area: result.prefill.area_name ?? draft.area,
        singpassVerified: result.singpass_verified,
      });
      router.push(path === 'family' ? '/onboarding/family' : '/onboarding/about');
    } catch {
      // The banner below says it didn't work; the buttons stay for another go.
    }
  };

  const google = async () => {
    if (!realGoogle) return void go('google');
    setGoogleFailed(false);
    setGoogleBusy(true);
    try {
      const result = await signInWithGoogle();
      if (result.status === 'signed-in') await go('google', result.name);
    } catch (error) {
      if (__DEV__) console.warn('[auth] Google sign-in failed', error);
      setGoogleFailed(true);
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <Screen
      title={t('onboarding.signIn.title')}
      readOut={() => t('onboarding.signIn.readout')}
      testID="screen-onboarding-sign-in"
    >
      <View style={styles.buttons}>
        <BigButton
          size="lg"
          icon={IdentificationCardIcon}
          label={t('onboarding.signIn.singpass')}
          disabled={busy}
          onPress={() => void go('singpass')}
          testID="sign-in-singpass"
        />
        <Text color="textSecondary">{t('onboarding.signIn.singpassHint')}</Text>
        <BigButton
          variant="outline"
          size="lg"
          icon={GoogleLogoIcon}
          label={t('onboarding.signIn.google')}
          disabled={busy}
          onPress={() => void google()}
          testID="sign-in-google"
        />
        {!showPhone ? null : phoneMode ? (
          <View style={styles.phone}>
            <TextField
              label={t('onboarding.signIn.phoneLabel')}
              value={phone}
              onChangeText={(value) => {
                setPhone(value);
                setPhoneError(null);
              }}
              keyboardType="phone-pad"
              autoComplete="tel"
              error={phoneError}
              testID="sign-in-phone-field"
            />
            <BigButton
              label={t('common.next')}
              disabled={busy || phone.trim() === ''}
              onPress={() => {
                if (!isSingaporeMobile(phone)) {
                  setPhoneError(t('onboarding.signIn.phoneInvalid'));
                  return;
                }
                void go('phone');
              }}
              testID="sign-in-phone-next"
            />
          </View>
        ) : (
          <BigButton
            variant="outline"
            size="lg"
            icon={DeviceMobileIcon}
            label={t('onboarding.signIn.phone')}
            disabled={busy}
            onPress={() => setPhoneMode(true)}
            testID="sign-in-phone"
          />
        )}
      </View>

      {signIn.isError ? <StatusBanner tone="notice" text={t('common.error')} /> : null}
      {googleFailed ? (
        <StatusBanner
          tone="notice"
          text={t('onboarding.signIn.googleFailed')}
          testID="sign-in-google-failed"
        />
      ) : null}

      <View style={styles.privacy}>
        <ShieldCheckIcon size={iconSize.inline} color={color.success} weight="fill" />
        <Text style={styles.flex}>{t('onboarding.signIn.privacy')}</Text>
      </View>
      {/* Singpass is always a mock in the hackathon; say so. */}
      {config.demoVoice || realGoogle ? (
        <Text color="textSecondary" testID="sign-in-demo-note">
          {realGoogle ? t('onboarding.signIn.demoNoteSingpass') : t('onboarding.signIn.demoNote')}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  buttons: {
    gap: space.sm,
  },
  phone: {
    gap: space.sm,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.xs,
    marginTop: space.md,
  },
  flex: {
    flex: 1,
  },
});
