import { useEffect, useRef } from 'react';
import { View } from 'react-native';

// Google's own sign-in button (Google Identity Services). Google hands back an ID token, which our server checks.
// Needs EXPO_PUBLIC_GOOGLE_CLIENT_ID, and this page's address listed as an authorised JavaScript origin for that client in Google Cloud.
const SRC = 'https://accounts.google.com/gsi/client';
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('google_script'));
      document.head.appendChild(s);
    });
  }
  return loading;
}

export const googleAvailable = !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleButton({ onToken, onError, locale }: { onToken: (idToken: string) => void; onError: () => void; locale?: string }) {
  const host = useRef<unknown>(null);
  const cb = useRef({ onToken, onError });
  cb.current = { onToken, onError };

  useEffect(() => {
    let dead = false;
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    loadScript()
      .then(() => {
        const g = (window as unknown as { google?: { accounts: { id: { initialize: (o: object) => void; renderButton: (el: Element, o: object) => void } } } }).google;
        const el = host.current as unknown as Element | null;
        if (dead || !g || !el) return;
        g.accounts.id.initialize({ client_id: clientId, callback: (r: { credential?: string }) => (r.credential ? cb.current.onToken(r.credential) : cb.current.onError()) });
        el.innerHTML = '';
        g.accounts.id.renderButton(el, { type: 'standard', theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 320, locale });
      })
      .catch(() => cb.current.onError());
    return () => {
      dead = true;
    };
  }, [locale]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <View ref={host as any} style={{ alignItems: 'center', minHeight: 44 }} />;
}
