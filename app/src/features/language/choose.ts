import { setLanguage } from '../../i18n/store';
import type { LangCode } from '../../i18n/languages';
import { sessionStore, updateProfile } from '../../session/store';

/** Change the app language, and, if someone is signed in, save it to their profile so it follows them to other devices. */
export async function chooseLanguage(code: LangCode): Promise<void> {
  await setLanguage(code);
  if (sessionStore.get().status === 'in') {
    try {
      await updateProfile({ language: code });
    } catch {
      /* the choice still applies on this device */
    }
  }
}
