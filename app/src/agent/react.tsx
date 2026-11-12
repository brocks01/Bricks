import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '../components/ui';
import { useT } from '../i18n';
import { useCurrentPage, useNavigate } from '../navigation/NavigationProvider';
import { colors, space } from '../theme/tokens';
import { registerRunner } from './live';
import { createAgentTools } from './tools';

type Pending = { title: string; input: Record<string, unknown>; resolve: (ok: boolean) => void };
type Agent = ReturnType<typeof createAgentTools> & { pending: Pending | null; answer: (ok: boolean) => void };

const AgentContext = createContext<Agent | null>(null);

/** Binds the agent tools to this app: navigation, the open page, and an approval gate the person controls. */
export function AgentProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const current = useCurrentPage();
  const currentRef = useRef(current);
  useEffect(() => {
    currentRef.current = current; // kept fresh after every commit
  });
  const [pending, setPending] = useState<Pending | null>(null);

  const tools = useMemo(
    () =>
      createAgentTools({
        currentPage: () => current?.key,
        open: (key, params) => navigate(key, params, { origin: 'agent' }),
        confirm: (title, input) => new Promise<boolean>((resolve) => setPending({ title, input, resolve })),
      }),
    [navigate, current]
  );

  useEffect(() => {
    registerRunner({ call: tools.call, page: () => currentRef.current?.key }); // read at call time, not render
  }, [tools]);

  const answer = useCallback((ok: boolean) => {
    setPending((p) => {
      p?.resolve(ok);
      return null;
    });
  }, []);

  const value = useMemo<Agent>(() => ({ ...tools, pending, answer }), [tools, pending, answer]);
  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent(): Agent {
  const a = useContext(AgentContext);
  if (!a) throw new Error('agent: no <AgentProvider> above this component.');
  return a;
}

/** Shown when the agent proposes something that needs the person's approval. Only the person can approve.
 *  The words are in the person's language like the rest of the app; only the plain label is shown, never the tool's arguments. */
export function ApprovalBanner() {
  const t = useT();
  const { pending, answer } = useAgent();
  if (!pending) return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ backgroundColor: colors.warnSoft, borderBottomWidth: 2, borderColor: colors.warn, padding: space.lg }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.ink }}>{t('common.agent.approve.ask')}</Text>
      <Text style={{ fontSize: 16, color: colors.ink, marginVertical: space.sm }}>{pending.title}</Text>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Button label={t('common.agent.approve.yes')} onPress={() => answer(true)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button kind="plain" label={t('common.agent.approve.no')} onPress={() => answer(false)} />
        </View>
      </View>
    </View>
  );
}
