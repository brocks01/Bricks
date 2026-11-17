import { ReactNode, useEffect } from 'react';
import { View } from 'react-native';
import { AppLoading } from './AppLoading';
import { useStore } from '../core/store';
import { clearProfile, firstTab, loadProfile, onboardingLocal, profileStore } from '../features/onboarding/state';
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

  // The server says who this person is to Interchange (roles, which tabs to show, whether their getting-to-know-you is finished).
  useEffect(() => {
    if (status === 'in' && complete) void loadProfile();
    if (status === 'out') clearProfile();
  }, [status, complete]);

  useEffect(() => {
    if (status === 'loading' || !current) return;
    if (status === 'in' && complete && !prof.loaded) return; // signed in, but we do not know yet if onboarding is done: wait, so the app never flashes before it
    if (status === 'out') {
      if (current.requiresAuth) go('auth.welcome', {}, { replace: true });
    } else if (!complete) {
      if (current.module !== 'onboarding') go('onboarding.index', {}, { replace: true });
    } else if (prof.profile && !prof.profile.onboarded && !onboardingLocal.done && current.module !== 'onboarding') {
      go('onboarding.index', {}, { replace: true });
    } else if (current.module === 'auth' || (current.key === 'onboarding.index' && prof.profile?.onboarded && !onboardingLocal.done)) {
      go(firstTab(prof.profile), {}, { replace: true });
    }
  }, [status, complete, current, go, prof.profile, prof.loaded]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {status === 'loading' || (status === 'in' && complete && !prof.loaded) ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <AppLoading />
        </View>
      ) : null}
    </View>
  );
}
