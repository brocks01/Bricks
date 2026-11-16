import { defineModule } from '../../navigation/registry';
import { signOut } from '../../session/store';
import { authLanguage } from './pages/language/page';
import { authSingpass } from './pages/singpass/page';
import { authSignIn } from './pages/signIn/page';
import { authWelcome } from './pages/welcome/page';

defineModule({
  id: 'auth',
  title: 'Sign in',
  summary: 'Signing in and out: email code, Google, Singpass (Singapore) and DigiLocker (India), and the first-time profile.',
  keywords: ['login', 'sign in', 'sign out', 'logout', 'account', 'register'],
  pages: [authWelcome, authLanguage, authSignIn, authSingpass],
  skills: [
    {
      name: 'signOut',
      summary: 'Sign the person out of this device.',
      input: [],
      confirm: true,
      keywords: ['logout', 'log out'],
      run: async () => {
        await signOut();
        return { ok: true, summary: 'Signed out.' };
      },
    },
  ],
});
