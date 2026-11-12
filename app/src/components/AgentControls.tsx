import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { audioAvailable } from '../agent/audio';
import { agentUi, end, startTalk } from '../agent/live';
import { openArea, setTyping, surfaceStore } from '../agent/surface';
import { useStore } from '../core/store';
import { useT } from '../i18n';
import { colors } from '../theme/tokens';

const G = '#1B7F3B';

/**
 * THE bottom area of the agent, identical in every state (closed bar, any sheet height, on a call): a keyboard button and ONE big call button,
 * green to call and red to hang up. There is no mic icon and no text here. The keyboard button shows or hides a one-line field above this row.
 * Starting a call opens NOTHING: the app stays usable. While the call is on, the red button glows and the empty space to its right shows tiny
 * listening bars and how long the call has been going. The conversation and any screen the agent makes are in the sheet, which opens only when
 * the person pulls it up.
 */
export function AgentControls() {
  const t = useT();
  const ui = useStore(agentUi);
  const { open, typing } = useStore(surfaceStore);
  const hearing = ui.phase !== 'idle' && ui.mic; // the call is on and the microphone really is
  const call = () => {
    if (hearing) {
      end();
      return;
    }
    if (ui.phase !== 'idle') end(); // a typed-only session: start again with the microphone
    void startTalk({ mic: audioAvailable() });
  };
  const keyboard = () => {
    if (!open) openArea(0.5);
    setTyping(!typing);
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12 }}>
      <View style={{ flex: 1, alignItems: 'flex-end', paddingRight: 22 }}>
        <Pressable onPress={keyboard} accessibilityRole="button" accessibilityLabel={t('common.agent.type')} accessibilityState={{ selected: typing }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: typing ? colors.accentSoft : colors.bg, borderWidth: 1, borderColor: typing ? colors.accentLine : colors.line, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="keypad-outline" size={22} color={typing ? G : colors.ink} />
        </Pressable>
      </View>
      <View style={{ width: 58, height: 58, alignItems: 'center', justifyContent: 'center' }}>
        {hearing ? <Glow /> : null}
        <Pressable onPress={call} accessibilityRole="button" accessibilityLabel={hearing ? t('common.agent.end') : t('common.agent.talk')} style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: hearing ? colors.danger : G, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={hearing ? 'phone-hangup' : 'phone'} size={28} color="#FFFFFF" />
        </Pressable>
      </View>
      <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 22 }}>{hearing ? <Listening since={ui.since} /> : null}</View>
    </View>
  );
}

/** A soft red ring that breathes around the hang-up button while the call is on: the sign that the agent is listening. */
function Glow() {
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 1100, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 1100, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', width: 58, height: 58, borderRadius: 29, backgroundColor: colors.danger, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }] }} />;
}

/** Tiny listening bars and the call time, in the space to the right of the call button. Nothing else. */
function Listening({ since }: { since: number | null }) {
  const bars = useState(() => [0, 1, 2, 3, 4].map(() => new Animated.Value(0.4)))[0];
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 20 }}>
        {bars.map((b, i) => (
          <Animated.View key={i} style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: G, transform: [{ scaleY: b }] }} />
        ))}
      </View>
      <Text style={{ fontSize: 13, color: colors.muted }}>{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')}</Text>
    </View>
  );
}
