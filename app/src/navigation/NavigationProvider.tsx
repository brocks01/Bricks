import { createContext, ReactNode, useCallback, useContext, useMemo } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { pageForPath } from './registry';
import { resolvePage } from './resolve';
import { note } from './log';
import type { Decision, Guard, Origin, PageDef } from './types';

type NavOptions = { origin?: Origin; replace?: boolean };
type Navigate = (pageKey: string, params?: Record<string, string>, opts?: NavOptions) => Decision;

interface NavValue {
  navigate: Navigate;
  back: () => void;
  pathFor: (pageKey: string, params?: Record<string, string>) => string;
  current: PageDef | undefined;
  path: string;
}

const NavContext = createContext<NavValue | null>(null);

/**
 * The ONLY place that touches the router. Screens never call router.push; they call useNavigate() with a page key.
 * A tap, a link, a notification and the agent are the same decision: only `origin` differs.
 */
export function NavigationProvider({ children, guard = () => ({ isAuthenticated: true }) }: { children: ReactNode; guard?: () => Guard }) {
  const router = useRouter();
  const path = usePathname();

  const navigate = useCallback<Navigate>(
    (key, params = {}, opts = {}) => {
      const origin = opts.origin ?? 'human';
      const d = resolvePage(key, params, guard()); // the guard is read at the moment of the move, so a fresh sign-in counts at once
      if (!d.ok) {
        note({ type: 'refused', key, origin, reason: d.reason });
        return d;
      }
      note({ type: 'moved', key, origin });
      if (opts.replace) router.replace(d.path as never);
      else router.push(d.path as never);
      return d;
    },
    [router, guard]
  );

  const back = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/' as never);
  }, [router]);

  const value = useMemo<NavValue>(
    () => ({
      navigate,
      back,
      pathFor: (key, params = {}) => {
        const d = resolvePage(key, params, guard());
        return d.ok ? d.path : '/';
      },
      current: pageForPath(path),
      path,
    }),
    [navigate, back, guard, path]
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

function useNav(): NavValue {
  const v = useContext(NavContext);
  if (!v) throw new Error('navigation: no <NavigationProvider> above this component.');
  return v;
}

/** Move to a page by key. The only way a screen changes route. */
export const useNavigate = (): Navigate => useNav().navigate;
/** Go back one step (or home if there is nowhere to go back to). */
export const useGoBack = () => useNav().back;
/** The address of a page, from the registry rather than a literal. */
export const usePathFor = () => useNav().pathFor;
/** Where am I? The page the person is on now. */
export const useCurrentPage = (): PageDef | undefined => useNav().current;
