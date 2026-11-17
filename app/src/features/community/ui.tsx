import { Ionicons } from '@expo/vector-icons';
import { useFocusLive } from '../../core/useFocusLive';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { SkeletonPage } from '../../components/Skeleton';
import { Button, Screen } from '../../components/ui';
import { BackScreen } from '../../components/BackButton';
import { cachePeek, cachePut } from '../../core/cache';
import { useStore } from '../../core/store';
import { useLanguage } from '../../i18n';
import { sessionStore } from '../../session/store';
import { colors, radius, space, type } from '../../theme/tokens';
import { Pic } from '../explore/ui';

// Small pieces shared by the community screens. No words of their own: callers pass them in, already in the person's language.

/** A short number that says which piece of code this is (so two screens that use the same key do not share a saved copy). */
function hashText(t: string): number {
  let h = 0;
  for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0;
  return h;
}

/** Loads something once the sign-in is known, and again every time the screen comes back into view (after a form, say). */
export function useLoad<T>(fn: () => Promise<T>, key: string) {
  const { status } = useStore(sessionStore);
  const latest = useRef(fn);
  // What this screen last loaded is kept, so coming back (a tab switch, reopening the app) shows it at once while the new answer is fetched.
  const [codeId] = useState(() => hashText(fn.toString()));
  const saveKey = `saved:load:${key}:${codeId}`;
  const [data, setData] = useState<T | null>(() => cachePeek<T>(saveKey)?.data ?? null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    latest.current = fn; // kept fresh after every commit; the load below reads it
  });
  useFocusLive(
    useCallback(() => {
      if (status !== 'in') return;
      let live = true;
      latest
        .current()
        .then((x) => {
          if (live) {
            setFailed(false);
            setData(x);
            cachePut(saveKey, x);
          }
        })
        .catch(() => {
          if (live) setFailed(true);
        });
      return () => {
        live = false;
      };
    }, [status, key, tick, saveKey]) // eslint-disable-line react-hooks/exhaustive-deps -- `key` says what to load; the function itself is read from the ref
  );
  return { data, setData, failed, reload: () => setTick((t) => t + 1) };
}

/** A date and time in the person's language: "Sun, 16 Nov, 6:00 AM". */
export function useWhen() {
  const lang = useLanguage();
  return (iso: string) => new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

/** Shows the skeleton while loading, the retry line when it failed, else the children with the data. */
export function Gate<T>({ title, back = true, data, failed, reload, notFound, tryAgain, children }: { title: string; back?: boolean; data: T | null; failed: boolean; reload: () => void; notFound: string; tryAgain: string; children: (d: T) => ReactNode }) {
  const Frame = back ? BackScreen : Screen; // a sub-screen gets the one floating Back button
  if (failed && !data) {
    return (
      <Frame title={title}>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{notFound}</Text>
        <Button label={tryAgain} onPress={reload} />
      </Frame>
    );
  }
  if (!data) {
    return (
      <Frame title={title}>
        <SkeletonPage cards={3} />
      </Frame>
    );
  }
  return <Frame title={title}>{children(data)}</Frame>;
}

/** The pill tabs under a title: Upcoming / My Events / Past. */
export function Tabs<K extends string>({ tabs, value, onChange }: { tabs: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <Pressable key={t.key} onPress={() => onChange(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, minHeight: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accentSoft : colors.card, borderWidth: 1, borderColor: on ? colors.accentLine : colors.line }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: on ? colors.accent : colors.muted }} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** One row of a list: a picture, a title, up to two grey lines, and whatever sits on the right (a Join button, a chevron). */
export function ListRow({ uri, icon, i = 0, title, lines, right, onPress }: { uri?: string | null; icon: keyof typeof Ionicons.glyphMap; i?: number; title: string; lines?: (string | null | undefined)[]; right?: ReactNode; onPress?: () => void }) {
  // The row and its right-hand button are SIBLINGS (a button inside a button is invalid on the web).
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, marginBottom: space.sm }}>
      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm }}>
        <Pic uri={uri} icon={icon} size={64} i={i} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{title}</Text>
          {(lines ?? []).filter(Boolean).map((l, n) => <Text key={n} style={[type.small, { color: colors.muted, marginTop: 2 }]}>{l}</Text>)}
        </View>
        {onPress && !right ? <Ionicons name="chevron-forward" size={22} color={colors.muted} /> : null}
      </Pressable>
      {right ? <View style={{ paddingRight: space.sm }}>{right}</View> : null}
    </View>
  );
}

/** The small green Join / Going pill at the right of a row. */
export function JoinPill({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ minWidth: 76, minHeight: 44, borderRadius: radius.button, backgroundColor: on ? colors.accent : colors.accentSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: on ? '#FFFFFF' : colors.accent }}>{label}</Text>
    </Pressable>
  );
}

/** The big green pill at the foot of a screen ("+ Create Event"). */
export function PillButton({ label, onPress, icon = 'add', kind = 'primary', disabled }: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap | null; kind?: 'primary' | 'outline'; disabled?: boolean }) {
  const solid = kind === 'primary';
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} style={{ minHeight: 56, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: space.lg, marginTop: space.md, backgroundColor: solid ? colors.accent : colors.card, borderWidth: solid ? 0 : 1.5, borderColor: colors.accent, opacity: disabled ? 0.5 : 1 }}>
      {icon ? <Ionicons name={icon} size={22} color={solid ? '#FFFFFF' : colors.accent} /> : null}
      <Text style={{ fontSize: 18, fontWeight: '700', color: solid ? '#FFFFFF' : colors.accent }}>{label}</Text>
    </Pressable>
  );
}

/** A grey line with a small icon, as used for the date, place and number going of an event. */
export function Fact({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.xs }}>
      <Ionicons name={icon} size={20} color={colors.ink} />
      <Text style={{ flex: 1, fontSize: 17, color: colors.ink }}>{text}</Text>
    </View>
  );
}

/** A wide picture (or a tinted block with a symbol) across the top of a detail screen. */
export function Banner({ uri, icon, height = 180 }: { uri?: string | null; icon: keyof typeof Ionicons.glyphMap; height?: number }) {
  return (
    <View style={{ height, borderRadius: radius.card, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentLine, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: space.md }}>
      {uri ? <Image source={{ uri }} accessibilityIgnoresInvertColors resizeMode="cover" style={{ position: 'absolute', width: '100%', height: '100%' }} /> : <Ionicons name={icon} size={64} color={colors.accent} />}
    </View>
  );
}
