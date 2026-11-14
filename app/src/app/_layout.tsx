import '../features'; // registers every module once
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { AgentProvider, ApprovalBanner } from '../agent';
import { AgentSurface } from '../components/AgentSurface';
import { AppTabBar } from '../components/AppTabBar';
import { AuthGate } from '../components/AuthGate';
import { PhoneFrame } from '../components/PhoneFrame';
import { ReminderPopups } from '../features/home/ReminderPopups';
import { LanguageProvider } from '../i18n';
import { NavigationProvider } from '../navigation';
import type { Guard } from '../navigation/types';
import { sessionStore } from '../session/store';

// Read at the moment of every move, so a fresh sign-in counts at once.
const guard = (): Guard => ({ isAuthenticated: sessionStore.get().status === 'in' });

// Providers, outermost first: language, navigation, agent. Under them: the door (sign-in check), the page, then the bottom bar.
export default function RootLayout() {
  return (
    <LanguageProvider>
      <NavigationProvider guard={guard}>
        <AgentProvider>
          <PhoneFrame>
            <StatusBar style="dark" />
            <ApprovalBanner />
            <AuthGate>
              <View style={{ flex: 1 }}>
                <Stack screenOptions={{ headerShown: false }} />
                <AgentSurface />
                <ReminderPopups />
              </View>
            </AuthGate>
            <AppTabBar />
          </PhoneFrame>
        </AgentProvider>
      </NavigationProvider>
    </LanguageProvider>
  );
}
