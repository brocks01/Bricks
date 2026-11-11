import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { audioAvailable } from '../agent/audio';
import { agentUi, end, sendText, startTalk } from '../agent/live';
import { answerSurface, hideSurface, setVoiceView, surfaceStore, type Surface } from '../agent/surface';
import { useStore } from '../core/store';
import { useLanguage, useT } from '../i18n';
import { colors, radius, space, type } from '../theme/tokens';
import { DragHandle } from './DragHandle';
import { HtmlFrame } from './HtmlFrame';
import { Button, type IconName } from './ui';

const iconFor = (name: string): IconName => (name && name in (Ionicons.glyphMap as Record<string, unknown>) ? (name as IconName) : 'apps');
const G = '#1B7F3B';

/**
 * The agent area, exactly as in ui-samples/12-agent-states.webp: a handle, a header (Bricks Agent, info, close), the conversation as bubbles
 * under "Today", and ONE control row (keyboard, a big mic, a waveform). When the agent makes a screen (a question, tiles, steps) it appears
 * INSIDE the conversation as the agent's own message, like a call. Voice active is the full-screen listening view. Nothing else is here.
 */
export function AgentSheet({ surface, onMove, onRelease }: { surface: Surface | null; onMove: (dy: number) => void; onRelease: (dy: number) => void }) {
  const t = useT();
  const { voice } = useStore(surfaceStore);
  const ui = useStore(agentUi);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [about, setAbout] = useState(false);
  const talking = ui.phase !== 'idle';

  const toggleCall = () => {
    if (talking) {
      end();
      setVoiceView(false);
    } else {
      setVoiceView(true);
      void startTalk({ mic: audioAvailable() });
    }
  };
  const send = () => {
    const v = text.trim();
    if (!v) return;
    setText('');
    void sendText(v);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
      <DragHandle label={t('agent.canvas.grow')} onMove={onMove} onRelease={onRelease} style={{ paddingTop: space.xs, paddingBottom: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg }}>
          <Ionicons name="sparkles" size={20} color={G} />
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: colors.ink }}>Bricks Agent</Text>
          <Pressable onPress={() => setAbout((v) => !v)} accessibilityRole="button" accessibilityLabel={t('common.agent.canvas.info')} accessibilityState={{ expanded: about }} hitSlop={10}>
            <Ionicons name="information-circle-outline" size={24} color={colors.ink} />
          </Pressable>
          <Pressable onPress={hideSurface} accessibilityRole="button" accessibilityLabel={t('common.agent.close')} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
        </View>
      </DragHandle>
      {about ? <Text style={{ fontSize: 13, lineHeight: 18, color: colors.muted, paddingHorizontal: space.lg, paddingBottom: space.sm }}>{t('common.agent.canvas.about')}</Text> : null}

      {voice ? <Listening phase={ui.phase} /> : <Chat surface={surface} />}

      {typing && !voice ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.lg, paddingBottom: space.sm }}>
          <TextInput value={text} onChangeText={setText} onSubmitEditing={send} placeholder={t('common.agent.type')} placeholderTextColor={colors.muted} accessibilityLabel={t('common.agent.type')} autoFocus style={{ flex: 1, fontSize: 16, color: colors.ink, backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: colors.line }} />
          <Pressable onPress={send} accessibilityRole="button" accessibilityLabel="Send" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: G, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}
      {ui.notice ? <Text style={{ fontSize: 13, color: colors.danger, fontWeight: '600', paddingHorizontal: space.lg, paddingBottom: 4 }}>{t(`common.agent.${ui.notice}`)}</Text> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: space.md, borderTopWidth: 1, borderColor: colors.line }}>
        <RoundButton icon="keypad-outline" label={t('common.agent.type')} on={typing && !voice} onPress={() => { setVoiceView(false); setTyping((v) => !v); }} />
        <Pressable onPress={toggleCall} accessibilityRole="button" accessibilityLabel={talking ? t('common.agent.end') : t('common.agent.talk')} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: talking ? colors.danger : G, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={talking ? 'stop' : 'mic'} size={talking ? 26 : 30} color="#FFFFFF" />
        </Pressable>
        <RoundButton icon="pulse" label={t('common.agent.listening')} on={voice} onPress={() => (talking ? setVoiceView(!voice) : toggleCall())} />
      </View>
    </View>
  );
}

function RoundButton({ icon, label, on, onPress }: { icon: IconName; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: on ? colors.accentSoft : colors.bg, borderWidth: 1, borderColor: on ? colors.accentLine : colors.line, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={24} color={on ? G : colors.ink} />
    </Pressable>
  );
}

/** The conversation: "Today", then bubbles (the person on the right, the agent on the left), then the screen the agent made, if any. */
function Chat({ surface }: { surface: Surface | null }) {
  const t = useT();
  const lang = useLanguage();
  const ui = useStore(agentUi);
  const { seq } = useStore(surfaceStore);
  const scroll = useRef<{ scrollToEnd: (o?: { animated?: boolean }) => void } | null>(null);
  const lines = ui.lines.filter((l) => l.role !== 'tool'); // what the agent did inside the app is not part of the chat
  useEffect(() => {
    const h = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(h);
  }, [lines.length, surface]);
  const time = (at?: number) => (at ? new Date(at).toLocaleTimeString(lang, { hour: 'numeric', minute: '2-digit' }) : '');
  return (
    <ScrollView ref={scroll as never} style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      {lines.length || surface ? <Text style={{ alignSelf: 'center', fontSize: 13, color: colors.muted, backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' }}>{t('common.agent.today')}</Text> : null}
      {!lines.length && !surface ? (
        <View style={{ alignItems: 'center', paddingVertical: space.xl }}>
          <Ionicons name="sparkles-outline" size={40} color={G} />
          <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginTop: space.sm }]}>{t('common.agent.tap')}</Text>
        </View>
      ) : null}
      {lines.map((l, i) =>
        l.role === 'person' ? (
          <View key={i} style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
            <Text style={{ fontSize: 16, lineHeight: 22, color: colors.ink, backgroundColor: '#DCF0E0', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, borderBottomRightRadius: 4, overflow: 'hidden' }}>{l.text}</Text>
            <Text style={{ fontSize: 11, color: colors.muted, alignSelf: 'flex-end', marginTop: 2 }}>{time(l.at)}</Text>
          </View>
        ) : (
          <View key={i} style={{ alignSelf: 'flex-start', maxWidth: '88%', flexDirection: 'row', gap: 8 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
              <Ionicons name="sparkles" size={15} color={G} />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontSize: 16, lineHeight: 22, color: colors.ink, backgroundColor: colors.bg, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16, borderTopLeftRadius: 4, overflow: 'hidden' }}>{l.text}</Text>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{time(l.at)}</Text>
            </View>
          </View>
        )
      )}
      {surface ? <SurfaceMessage key={seq} surface={surface} /> : null}
    </ScrollView>
  );
}

/** The agent's screen, as one of its messages: a title, words, a question, tiles or buttons, a typed answer, steps, then Next. */
function SurfaceMessage({ surface }: { surface: Surface }) {
  const t = useT();
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const chosen = surface.tiles.filter((x) => picked.includes(x.id)).map((x) => x.label);
  const showNext = surface.next || surface.tiles.length > 0;
  const submit = () => {
    if (chosen.length) answerSurface(chosen.join(', '), 'option');
    else if (typed.trim()) answerSurface(typed.trim(), 'typed');
    else answerSurface('next', 'option');
  };
  return (
    <View style={{ alignSelf: 'stretch', gap: space.md, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.accentLine, padding: space.md }}>
      <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 4 }}>
        <Ionicons name="sparkles" size={12} color={G} />
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.ink }} numberOfLines={1}>{t('common.agent.canvas.badge')}</Text>
      </View>
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
        <Button key={o} kind="plain" label={o} onPress={() => answerSurface(o, 'option')} />
      ))}

      {surface.allowText ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput value={typed} onChangeText={setTyped} onSubmitEditing={() => typed.trim() && answerSurface(typed.trim(), 'typed')} placeholder={t('common.agent.type')} placeholderTextColor={colors.muted} accessibilityLabel={t('common.agent.type')} style={{ flex: 1, fontSize: 16, color: colors.ink, backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: colors.line }} />
          <Pressable onPress={() => typed.trim() && answerSurface(typed.trim(), 'typed')} accessibilityRole="button" accessibilityLabel="Send" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: G, alignItems: 'center', justifyContent: 'center' }}>
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

      {surface.html ? <HtmlFrame html={surface.html} /> : null}

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

/** Voice active: the whole area is the listening view (state 6 of the picture). */
function Listening({ phase }: { phase: string }) {
  const t = useT();
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const word = phase === 'speaking' ? t('common.agent.speaking') : phase === 'working' ? t('common.agent.working') : phase === 'connecting' ? t('common.agent.connecting') : phase === 'idle' ? t('common.agent.tap') : t('common.agent.listening');
  const heights = [26, 50, 74, 44, 62, 30];
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.lg }}>
      <Animated.View style={{ width: 190, height: 190, borderRadius: 95, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] }) }] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {heights.map((h, i) => (
            <View key={i} style={{ width: 8, height: h, borderRadius: 4, backgroundColor: G }} />
          ))}
        </View>
      </Animated.View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.ink }}>{word}</Text>
      <Text style={[type.small, { color: colors.muted, textAlign: 'center' }]}>{t('common.agent.speakAny')}</Text>
    </View>
  );
}
