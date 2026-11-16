import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { audioAvailable } from '../agent/audio';
import { orbHidden } from '../agent/orbHidden';
import { agentUi, clearNotice, end, startTalk } from '../agent/live';
import { useStore } from '../core/store';
import { useT } from '../i18n';
import { colors } from '../theme/tokens';

const G = '#B0502A';
const SIZE = 46;
const LINE = '#E2DACB'; // the design's warm hairline
const SHADOW = { shadowColor: '#111827', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 } as const;

/**
 * THE agent. One small white round button with a thin microphone line icon, bottom-left just above the tab bar (the "Voice helper" of the
 * owner's design artifact: 46px, 1px warm border, soft shadow); it takes no room in the page. Tap it: a dark toast says it is listening and the
 * button grows into a white pill with listening bars, the time and an end button. The agent speaks and acts on the app itself.
 * There is no sheet, no chat list and no screen of its own. When the call ends the pill shrinks back to the button.
 */
export function AgentOrb() {
  const t = useT();
  const { notice, phase, mic } = useStore(agentUi);
  const [toast, setToast] = useState(false);
  const { hide } = useStore(orbHidden);
  const on = phase !== 'idle' && mic;
  useEffect(() => {
    if (!on) return;
    const show = setTimeout(() => setToast(true), 0); // the toast shows when the call starts, for two seconds
    const hide = setTimeout(() => setToast(false), 2200);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
      setToast(false);
    };
  }, [on]);
  useEffect(() => {
    if (!notice) return;
    const h = setTimeout(clearNotice, 7000); // the reason shows for a few seconds, then goes
    return () => clearTimeout(h);
  }, [notice]);
  if (hide && phase === 'idle' && !notice) return null; // a screen with its own big mic shows only that one
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 14, bottom: '100%', marginBottom: 12, alignItems: 'flex-start', gap: 8, zIndex: 40 }}>
      {notice ? <Text accessibilityLiveRegion="polite" style={{ maxWidth: 240, fontSize: 13, color: colors.danger, fontWeight: '600', textAlign: 'left', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>{t(`common.agent.${notice}`)}</Text> : null}
      {toast ? <Text accessibilityLiveRegion="polite" style={{ backgroundColor: '#111827', color: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontWeight: '500', overflow: 'hidden' }}>{t('common.agent.listening')}</Text> : null}
      <Trigger />
    </View>
  );
}

function Trigger() {
  const t = useT();
  const ui = useStore(agentUi);
  const active = ui.phase !== 'idle';
  const hearing = active && ui.mic;
  if (!active) {
    return (
      <Pressable onPress={() => void startTalk({ mic: audioAvailable() })} accessibilityRole="button" accessibilityLabel={t('common.agent.talk')} style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center', ...SHADOW }}>
        <Ionicons name="mic-outline" size={22} color="#111827" />
      </Pressable>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: SIZE, borderRadius: SIZE / 2, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: LINE, paddingLeft: 14, paddingRight: 4, gap: 6, ...SHADOW }}>
      {hearing ? <Listening since={ui.since} /> : <Ionicons name="mic-outline" size={20} color="#111827" />}
      <Pressable onPress={end} accessibilityRole="button" accessibilityLabel={t('common.agent.end')} hitSlop={4} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="close" size={22} color={colors.danger} />
      </Pressable>
    </View>
  );
}

/** Tiny listening bars and the call time. Nothing else. */
function Listening({ since }: { since: number | null }) {
  const bars = useState(() => [0, 1, 2, 3].map(() => new Animated.Value(0.4)))[0];
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const loops = bars.map((b, i) => Animated.loop(Animated.sequence([Animated.timing(b, { toValue: 1, duration: 380 + i * 90, useNativeDriver: true }), Animated.timing(b, { toValue: 0.3, duration: 420 + i * 70, useNativeDriver: true })])));
    loops.forEach((l) => l.start());
    const tick = () => setSec(since ? Math.floor((Date.now() - since) / 1000) : 0);
    const first = setTimeout(tick, 0); // the first second comes a tick later: the clock is not read during render
    const iv = setInterval(tick, 1000);
    return () => {
      loops.forEach((l) => l.stop());
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [bars, since]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} accessibilityLiveRegion="polite">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 18 }}>
        {bars.map((b, i) => (
          <Animated.View key={i} style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: G, transform: [{ scaleY: b }] }} />
        ))}
      </View>
      <Text style={{ fontSize: 13, color: colors.ink }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</Text>
    </View>
  );
}
