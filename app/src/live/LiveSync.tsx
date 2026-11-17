import { useEffect, useRef } from 'react';
import { cacheInvalidate, setCacheOwner } from '../core/cache';
import { useStore } from '../core/store';
import { useCurrentPage, useNavigate } from '../navigation';
import { freshToken, sessionStore } from '../session/store';
import { liveSetPage, startLive } from './client';

/**
 * Mount once, inside the sign-in door. While signed in it (1) keeps the saved copy of server data for THIS account (and erases it on sign-out),
 * (2) holds the live link so the server knows the app is open, (3) refreshes whatever the server says changed, and (4) opens a page when the
 * agent (for example on a phone call) was asked to show it. Opening goes through the same guarded navigation as a tap, marked as the agent's move.
 */
export function LiveSync() {
  const { status, user, activeProfile } = useStore(sessionStore);
  const navigate = useNavigate();
  const page = useCurrentPage();
  const pageKey = page?.key ?? '';
  const navRef = useRef(navigate);
  const pageRef = useRef(pageKey);
  useEffect(() => {
    navRef.current = navigate;
    pageRef.current = pageKey;
  });

  const owner = status === 'in' ? (activeProfile ?? user?.id ?? null) : null;
  useEffect(() => {
    void setCacheOwner(owner);
  }, [owner]);

  useEffect(() => {
    if (status !== 'in') return;
    return startLive({
      onChanged: cacheInvalidate,
      onOpen: (key, params) => {
        navRef.current(key, params, { origin: 'agent' });
      },
      token: freshToken,
      page: () => pageRef.current,
    });
  }, [status]);

  useEffect(() => {
    liveSetPage(pageKey);
  }, [pageKey]);

  return null;
}
