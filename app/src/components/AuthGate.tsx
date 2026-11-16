import { ReactNode, useEffect } from 'react';
import { View } from 'react-native';
import { AppLoading } from './AppLoading';
import { useStore } from '../core/store';
import { clearProfile, firstTab, loadProfile, profileStore } from '../features/onboarding/state';
import { useCurrentPage, useNavigate } from '../navigation';
import { bootSession, sessionStore } from '../session/store';

/**
 * Starts the session once, then keeps the person on the right side of the door:
 * signed out and on a private page, go to Welcome; signed in without a name, go to Setup;
 * signed in and on a sign-in page, go Home. While the saved session is being checked, a spinner covers the page.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, user } = useStore(sessionStore);
  const current = useCurrentPage();
  const go = useNavigate();
  const complete = !!user?.profile_complete;
  const prof = useStore(profileStore);

  useEffect(() => {
    void bootSession();
  }, []);

  // The server says who this person is to Wisdom (roles, which tabs to show, whether their getting-to-know-you is finished).
  useEffect(() => {
    if (status === 'in' && complete) void loadProfile();
    if (status === 'out') clearProfile();
  }, [status, complete]);

  useEffect(() => {
    if (status === 'loading' || !current) return;
    if (status === 'out') {
      if (current.requiresAuth) go('auth.welcome', {}, { replace: true });
    } else if (!complete) {
      if (current.key !== 'auth.setup') go('auth.setup', {}, { replace: true });
    } else if (prof.profile && !prof.profile.onboarded && current.module !== 'onboarding') {
      go('onboarding.index', {}, { replace: true });
    } else if (current.module === 'auth') {
      go(firstTab(prof.profile), {}, { replace: true });
    }
  }, [status, complete, current, go, prof.profile]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {status === 'loading' ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <AppLoading />
        </View>
      ) : null}
    </View>
  );
}
