import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Text, View } from 'react-native';
import { registerControl } from '../agent/pageControls';
import { useStore } from '../core/store';
import { useT } from '../i18n';
import type { ElementDef, PageDef } from '../navigation/types';
import { colors, space } from '../theme/tokens';
import { glowStore } from './glow';
import { elementKey } from './page';

type PageLike = Pick<PageDef, 'key' | 'elements'>;

/** The page's words in the person's language: w('title') gives the words for element "title" of this page. */
export function usePageWords(page: PageLike) {
  const t = useT();
  return useCallback((id: string, vars?: Record<string, string | number>) => t(`${page.key}.${id}`, vars), [t, page.key]);
}

function needElement(page: PageLike, id: string, kinds: string[]): ElementDef {
  const el = page.elements[id];
  if (!el) throw new Error(`page "${page.key}" declares no element "${id}"`);
  if (!kinds.includes(el.kind)) throw new Error(`page "${page.key}": element "${id}" is a ${el.kind}, not ${kinds.join(' or ')}`);
  return el;
}

/** Expose a field to the agent. It can read the value and type into it while the person watches. */
export function useField(page: PageLike, id: string, value: unknown, setValue: (v: unknown) => void) {
  const el = needElement(page, id, ['field', 'choice']);
  const w = usePageWords(page);
  const label = w(id);
  const ref = useRef({ value, setValue });
  useEffect(() => {
    ref.current = { value, setValue }; // kept fresh after every commit; the agent reads it between renders
  });
  useEffect(
    () =>
      registerControl({ key: elementKey(page, id), page: page.key, id, kind: 'field', label, type: el.type, options: el.options, get: () => (el.secret ? undefined : ref.current.value), set: (v) => ref.current.setValue(v) }),
    [page, id, label, el.type, el.options, el.secret]
  );
}

/** Expose a button to the agent. */
export function useAction(page: PageLike, id: string, run: () => unknown) {
  needElement(page, id, ['action']);
  const w = usePageWords(page);
  const label = w(id);
  const ref = useRef(run);
  useEffect(() => {
    ref.current = run; // kept fresh after every commit
  });
  useEffect(
    () =>
      registerControl({
        key: elementKey(page, id),
        page: page.key,
        id,
        kind: 'action',
        label,
        run: async () => {
          await ref.current();
        },
      }),
    [page, id, label]
  );
}

/** Wraps an element. When the agent is acting on it, it glows with a pulsing ring; a person's own taps never glow. */
export function El({ page, id, children }: { page: PageLike; id: string; children: ReactNode }) {
  const g = useStore(glowStore);
  const on = g.key === elementKey(page, id);
  const pulse = useState(() => new Animated.Value(0.4))[0];
  const [still, setStill] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!on || still) return;
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 450, useNativeDriver: false }), Animated.timing(pulse, { toValue: 0.4, duration: 450, useNativeDriver: false })]));
    loop.start();
    return () => loop.stop();
  }, [on, still, pulse]);
  return (
    <View style={{ position: 'relative' }}>
      {children}
      {on ? (
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderRadius: 18, borderWidth: 3, borderColor: colors.accent, opacity: still ? 1 : pulse, boxShadow: '0 0 18px rgba(15,110,86,0.55)' }}
        />
      ) : null}
    </View>
  );
}

/** A line at the top saying what the assistant is doing right now, for people who cannot see the glow. */
export function AgentCaption() {
  const g = useStore(glowStore);
  if (!g.key) return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ backgroundColor: colors.accentSoft, paddingVertical: space.sm, paddingHorizontal: space.lg, borderBottomWidth: 1, borderColor: colors.accent }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{g.caption}</Text>
    </View>
  );
}
