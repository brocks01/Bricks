import { ReactNode, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useStore } from '../core/store';
import { useCurrentPage, useNavigate } from '../navigation';
import { bootSession, sessionStore } from '../session/store';
import { colors } from '../theme/tokens';

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

  useEffect(() => {
    void bootSession();
  }, []);

  useEffect(() => {
    if (status === 'loading' || !current) return;
    if (status === 'out') {
      if (current.requiresAuth) go('auth.welcome', {}, { replace: true });
    } else if (!complete) {
      if (current.key !== 'auth.setup') go('auth.setup', {}, { replace: true });
    } else if (current.module === 'auth') {
      go('connect.index', {}, { replace: true });
    }
  }, [status, complete, current, go]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {status === 'loading' ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : null}
    </View>
  );
}
