import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { BigButton, Text } from '@/components';
import { ReadOutProvider } from '@/features/readout/ReadOutProvider';
import { ReminderAlarms } from '@/features/reminders/ReminderAlarms';
// Importing @/i18n also initialises i18next before any screen renders.
import { setLanguage } from '@/i18n';
import type { Language } from '@/i18n/languages';
import { useActiveLanguage } from '@/i18n/useActiveLanguage';
import { createQueryClient, useAppStateFocus } from '@/lib/queryClient';
import { useSettingsHydrated } from '@/state/settings';
import { color, fontAssets, screenPadding, space } from '@/theme';
import { TypographyProvider } from '@/theme/TypographyProvider';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: '(tabs)',
};

/** If startup ever stalls (storage or font loading), show the app anyway. */
const STARTUP_TIMEOUT_MS = 4000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const hydrated = useSettingsHydrated();
  const language = useActiveLanguage();
  const [i18nLanguage, setI18nLanguage] = useState<Language | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    setLanguage(language)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setI18nLanguage(language);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, language]);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontError && __DEV__) console.warn('[fonts] failed to load, using system fonts', fontError);
  }, [fontError]);

  const startupDone =
    timedOut || ((fontsLoaded || fontError != null) && hydrated && i18nLanguage === language);

  // Latch: once the app has started, a later language change must not unmount it.
  // (Adjusting state while rendering is React's recommended pattern for derived state.)
  const [ready, setReady] = useState(false);
  if (startupDone && !ready) setReady(true);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <AppProviders language={language} fontsLoaded={fontsLoaded}>
      <StatusBar style="dark" />
      <ReminderAlarms />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: color.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="sos"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppProviders>
  );
}

function AppProviders({
  language,
  fontsLoaded,
  children,
}: {
  language: Language;
  fontsLoaded: boolean;
  children: ReactNode;
}) {
  const [queryClient] = useState(createQueryClient);
  useAppStateFocus();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <TypographyProvider language={language} fontsLoaded={fontsLoaded}>
          <ReadOutProvider language={language}>{children}</ReadOutProvider>
        </TypographyProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Shown if a screen crashes. Rendered outside the providers above, so it only
 * uses components that work without them. Plain words, one action.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const { t } = useTranslation();

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
    if (__DEV__) console.error('[ErrorBoundary]', error);
  }, [error]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.errorRoot}>
        <View style={styles.errorBody}>
          <Text variant="title">{t('common.error')}</Text>
        </View>
        <BigButton label={t('common.tryAgain')} onPress={retry} testID="error-retry" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorRoot: {
    flex: 1,
    backgroundColor: color.bg,
    padding: screenPadding,
    gap: space.lg,
  },
  errorBody: {
    flex: 1,
    justifyContent: 'center',
  },
});
