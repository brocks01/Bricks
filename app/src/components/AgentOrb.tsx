import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { audioAvailable } from '../agent/audio';
import { agentUi, clearNotice, end, startTalk } from '../agent/live';
import { openArea, setTyping, surfaceStore } from '../agent/surface';
import { useStore } from '../core/store';
import { useT } from '../i18n';
import { colors } from '../theme/tokens';

const G = '#1B7F3B';
const SIZE = 44;

/**
 * THE agent trigger. One small round orb, no name, no phone icon. Tap it and the agent starts listening; the orb grows into a pill with
 * listening bars, the time, a keyboard button and an end button. Tapping the pill itself opens the conversation sheet. The app stays usable:
 * starting a call opens nothing. When the call ends the pill shrinks back to the orb.
 *
 * `AgentOrb` floats bottom-right just above the tab bar (it takes no room in the page). `AgentTrigger` is the same control placed inline,
 * used inside the sheet. The AI-made warning lives in the sheet (components/AgentSheet.tsx).
 */
export function AgentOrb() {
  const t = useT();
  const { notice } = useStore(agentUi);
  useEffect(() => {
    if (!notice) return;
    const h = setTimeout(clearNotice, 7000); // the reason shows for a few seconds, then goes
    return () => clearTimeout(h);
  }, [notice]);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: 14, bottom: '100%', marginBottom: 12, alignItems: 'flex-end', gap: 6, zIndex: 40 }}>
      {notice ? <Text accessibilityLiveRegion="polite" style={{ maxWidth: 240, fontSize: 13, color: colors.danger, fontWeight: '600', textAlign: 'right', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}>{t(`common.agent.${notice}`)}</Text> : null}
      <AgentTrigger floating />
    </View>
  );
}

/** The orb at rest, the pill during a call. `floating`: tapping the pill opens the sheet. Inside the sheet it is already open. */
export function AgentTrigger({ floating = false }: { floating?: boolean }) {
  const t = useT();
  const ui = useStore(agentUi);
  const { typing } = useStore(surfaceStore);
  const active = ui.phase !== 'idle';
  const hearing = active && ui.mic;
  const start = () => void startTalk({ mic: audioAvailable() });
  const keyboard = () => {
    if (floating) openArea(0.5);
    setTyping(floating ? true : !typing);
  };
  if (!active) {
    return (
      <Pressable onPress={start} accessibilityRole="button" accessibilityLabel={t('common.agent.talk')} style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentLine, alignItems: 'center', justifyContent: 'center', opacity: floating ? 0.92 : 1 }}>
        <Ionicons name="sparkles" size={22} color={G} />
      </Pressable>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: SIZE, borderRadius: SIZE / 2, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentLine, paddingLeft: 14, paddingRight: 4, gap: 4 }}>
      <Pressable onPress={floating ? () => openArea(0.74) : undefined} accessibilityRole="button" accessibilityLabel={t('common.agent.canvas.grow')} style={{ height: SIZE, justifyContent: 'center' }}>
        {hearing ? <Listening since={ui.since} /> : <Ionicons name="sparkles" size={20} color={G} />}
      </Pressable>
      <Pressable onPress={keyboard} accessibilityRole="button" accessibilityLabel={t('common.agent.type')} accessibilityState={{ selected: typing }} hitSlop={4} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: typing ? colors.card : 'transparent' }}>
        <Ionicons name="keypad-outline" size={20} color={G} />
      </Pressable>
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
