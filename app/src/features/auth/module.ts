import { defineModule } from '../../navigation/registry';
import { signOut } from '../../session/store';
import { authTextSize } from './pages/textSize/page';
import { authWho } from './pages/who/page';
import { authSignIn } from './pages/signIn/page';
import { authVerify } from './pages/verify/page';
import { authWelcome } from './pages/welcome/page';

defineModule({
  id: 'auth',
  title: 'Sign in',
  summary: 'Signing in and out: email code, Google, Singpass (Singapore) and DigiLocker (India), and the first-time profile.',
  keywords: ['login', 'sign in', 'sign out', 'logout', 'account', 'register'],
  pages: [authWelcome, authTextSize, authWho, authSignIn, authVerify],
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
