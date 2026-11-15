import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { agentUi, sendText } from '../agent/live';
import { answerSurface, fitToContent, surfaceStore, type Surface } from '../agent/surface';
import { useStore } from '../core/store';
import { useLanguage, useT } from '../i18n';
import { colors, radius, space, type } from '../theme/tokens';
import { AgentTrigger } from './AgentOrb';
import { DragHandle } from './DragHandle';
import { Button, type IconName } from './ui';

const iconFor = (name: string): IconName => (name && name in (Ionicons.glyphMap as Record<string, unknown>) ? (name as IconName) : 'apps');
const G = '#1B7F3B';

/**
 * THE agent sheet: a handle, the body, one small warning, and the bottom area (components/AgentOrb.tsx). Nothing else, at any height.
 * The body is the conversation (bubbles under "Today"); the screen the agent makes (a question, tiles, steps) is one of its messages inside it.
 * On a call with nothing else to show, the body is the call screen: a waveform, "Listening", a timer. With a conversation or a screen it stays the
 * chat, so the person can always see the choices while they speak. Closing is dragging the sheet all the way down.
 */
export function AgentSheet({ surface, onMove, onRelease }: { surface: Surface | null; onMove: (dy: number) => void; onRelease: (dy: number) => void }) {
  const t = useT();
  const ui = useStore(agentUi);
  const { typing } = useStore(surfaceStore);
  const [text, setText] = useState('');
  const hearing = ui.phase !== 'idle' && ui.mic;
  const empty = ui.lines.filter((l) => l.role !== 'tool' && l.text.trim()).length === 0 && !surface;
  const send = () => {
    const v = text.trim();
    if (!v) return;
    setText('');
    void sendText(v);
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
      <DragHandle label={t('agent.canvas.grow')} onMove={onMove} onRelease={onRelease} style={{ paddingTop: space.xs, paddingBottom: space.xs }} />
      {hearing && empty ? <CallScreen phase={ui.phase} since={ui.since} /> : <Chat surface={surface} />}
      {typing ? (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
          <TextInput value={text} onChangeText={setText} onSubmitEditing={send} returnKeyType="send" placeholder={t('common.agent.type')} placeholderTextColor={colors.muted} accessibilityLabel={t('common.agent.type')} autoFocus style={{ fontSize: 16, color: colors.ink, backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: G }} />
        </View>
      ) : null}
      {ui.notice ? <Text style={{ fontSize: 13, color: colors.danger, fontWeight: '600', paddingHorizontal: space.lg, paddingBottom: 4, textAlign: 'center' }}>{t(`common.agent.${ui.notice}`)}</Text> : null}
      <View style={{ borderTopWidth: 1, borderColor: colors.line }}>
        <View style={{ alignItems: 'flex-end', paddingHorizontal: space.lg, paddingVertical: space.sm }}>
          <AgentTrigger />
        </View>
        <Warning />
      </View>
    </View>
  );
}

/** The one marker that the agent's words are AI-made: very small, just below the call button, never in the way. */
export function Warning() {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingBottom: 8 }}>
      <Ionicons name="alert-circle-outline" size={11} color={colors.muted} />
      <Text style={{ fontSize: 11, color: colors.muted }}>{t('common.agent.warn')}</Text>
    </View>
  );
}

/** The conversation: "Today", then bubbles (the person on the right, the agent on the left), then the screen the agent made, if any. */
function Chat({ surface }: { surface: Surface | null }) {
  const t = useT();
  const lang = useLanguage();
  const ui = useStore(agentUi);
  const { seq } = useStore(surfaceStore);
  const scroll = useRef<{ scrollToEnd: (o?: { animated?: boolean }) => void } | null>(null);
  const lines = ui.lines.filter((l) => l.role !== 'tool' && l.text.trim()); // what the agent did inside the app, and any empty line, is not part of the chat
  useEffect(() => {
    const h = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(h);
  }, [lines.length, surface]);
  const time = (at?: number) => (at ? new Date(at).toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' }) : '');
  return (
    <ScrollView ref={scroll as never} style={{ flex: 1 }} showsVerticalScrollIndicator={false} onContentSizeChange={(_w, h) => { if (surface) fitToContent(h); }} contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      {lines.length || surface ? <Text style={{ alignSelf: 'center', fontSize: 13, color: colors.muted, backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' }}>{t('common.agent.today')}</Text> : null}
      {!lines.length && !surface ? (
        <View style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <Ionicons name="sparkles-outline" size={40} color={G} />
        </View>
      ) : null}
      {lines.map((l, i) =>
        l.role === 'person' ? (
          <View key={i} style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
            <Text style={{ fontSize: 16, lineHeight: 22, color: colors.ink, backgroundColor: '#DCF0E0', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, borderBottomRightRadius: 4, overflow: 'hidden' }}>{l.text}</Text>
            <Text style={{ fontSize: 11, color: colors.muted, alignSelf: 'flex-end', marginTop: 2 }}>{time(l.at)}</Text>
          </View>
        ) : (
          <View key={i} style={{ alignSelf: 'flex-start', maxWidth: '88%' }}>
            <Text style={{ fontSize: 16, lineHeight: 22, color: colors.ink, backgroundColor: colors.bg, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, borderTopLeftRadius: 4, overflow: 'hidden' }}>{l.text}</Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{time(l.at)}</Text>
          </View>
        )
      )}
      {surface ? <SurfaceMessage key={seq} surface={surface} /> : null}
    </ScrollView>
  );
}

/** The agent's screen: a title, words, a question, tiles or buttons, a typed answer, steps, then Next. Used in the chat and in the pop-up. */
export function SurfaceMessage({ surface }: { surface: Surface }) {
  const t = useT();
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const chosen = surface.tiles.filter((x) => picked.includes(x.id)).map((x) => x.label);
  const showNext = surface.next || surface.tiles.length > 0;
  // The agent is told the answer through the call. If the call has ended meanwhile (it cuts itself after a quiet spell) the answer would go nowhere,
  // so it is sent as a message instead, which brings the agent back.
  const answer = (a: string, how: 'option' | 'typed') => {
    answerSurface(a, how);
    if (agentUi.get().phase === 'idle') void sendText(a);
  };
  const submit = () => {
    if (chosen.length) answer(chosen.join(', '), 'option');
    else if (typed.trim()) answer(typed.trim(), 'typed');
    else answer('next', 'option');
  };
  return (
    <View style={{ alignSelf: 'stretch', gap: space.md, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.accentLine, padding: space.md }}>
      {surface.title ? <Text style={[type.h2, { color: colors.ink }]} accessibilityRole="header">{surface.title}</Text> : null}
      {surface.message ? <Text style={[type.body, { color: colors.muted }]}>{surface.message}</Text> : null}
      {surface.question ? <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }} accessibilityRole="header">{surface.question}</Text> : null}

      {surface.tiles.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {surface.tiles.map((tile) => {
            const on = picked.includes(tile.id);
            return (
              <Pressable key={tile.id} onPress={() => toggle(tile.id)} accessibilityRole="checkbox" accessibilityLabel={tile.label} accessibilityState={{ checked: on }} style={{ flexBasis: '30%', flexGrow: 1, minHeight: 84, borderRadius: radius.card, borderWidth: on ? 2 : 1, borderColor: on ? G : colors.line, backgroundColor: on ? colors.accentSoft : colors.card, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: space.md, paddingHorizontal: 6 }}>
                <Ionicons name={iconFor(tile.icon)} size={24} color={on ? G : colors.ink} />
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink, textAlign: 'center' }}>{tile.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {surface.options.map((o) => (
        <Button key={o} kind="plain" label={o} onPress={() => answer(o, 'option')} />
      ))}

      {surface.allowText ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput value={typed} onChangeText={setTyped} onSubmitEditing={() => typed.trim() && answer(typed.trim(), 'typed')} placeholder={t('common.agent.type')} placeholderTextColor={colors.muted} accessibilityLabel={t('common.agent.type')} style={{ flex: 1, fontSize: 16, color: colors.ink, backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: colors.line }} />
          <Pressable onPress={() => typed.trim() && answer(typed.trim(), 'typed')} accessibilityRole="button" accessibilityLabel="Send" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: G, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}

      {surface.hint ? (
        <View style={{ flexDirection: 'row', gap: space.md, backgroundColor: colors.accentSoft, borderRadius: radius.card, padding: space.md, alignItems: 'flex-start' }}>
          <Ionicons name="clipboard-outline" size={22} color={G} style={{ marginTop: 2 }} />
          <Text style={[type.body, { color: colors.ink, flex: 1 }]}>{surface.hint}</Text>
        </View>
      ) : null}

      {surface.steps.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: G, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>{i + 1}</Text>
          </View>
          <Text style={[type.body, { color: colors.ink, flex: 1 }]}>{s}</Text>
        </View>
      ))}

      {surface.stepTotal > 0 || showNext ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          {surface.stepTotal > 0 ? (
            <View style={{ flex: 1, flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: surface.stepTotal, now: surface.step }}>
              {Array.from({ length: surface.stepTotal }, (_, i) => (
                <View key={i} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: i + 1 === surface.step ? G : colors.line }} />
              ))}
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {showNext ? <Button label={t('common.agent.canvas.next')} icon="arrow-forward" onPress={submit} disabled={surface.tiles.length > 0 && chosen.length === 0} /> : null}
        </View>
      ) : null}
    </View>
  );
}

/** On a call with nothing else to show: a waveform, what the agent is doing, and how long the call has been going. */
function CallScreen({ phase, since }: { phase: string; since: number | null }) {
  const t = useT();
  const pulse = useState(() => new Animated.Value(0))[0];
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true })]));
    loop.start();
    const tick = () => setSec(since ? Math.floor((Date.now() - since) / 1000) : 0);
    const first = setTimeout(tick, 0); // the first second comes a tick later: the clock is not read during render
    const iv = setInterval(tick, 1000);
    return () => {
      loop.stop();
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [pulse, since]);
  const word = phase === 'speaking' ? t('common.agent.speaking') : phase === 'working' ? t('common.agent.working') : phase === 'connecting' ? t('common.agent.connecting') : t('common.agent.listening');
  const heights = [26, 50, 74, 44, 62, 30];
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.lg }}>
      <Animated.View style={{ width: 170, height: 170, borderRadius: 85, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] }) }] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {heights.map((h, i) => (
            <View key={i} style={{ width: 8, height: h, borderRadius: 4, backgroundColor: G }} />
          ))}
        </View>
      </Animated.View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>{word}</Text>
      <Text style={{ fontSize: 15, color: colors.muted }}>{String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')}</Text>
    </View>
  );
}
