import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { DragHandle } from '../components/DragHandle';
import { useStore } from '../core/store';
import { useT } from '../i18n';
import { glowStore } from '../kit/glow';
import { colors, radius, space } from '../theme/tokens';
import { audioAvailable } from './audio';
import { agentUi, clearNotice, end, sendText, startTalk, togglePanel } from './live';
import { restoreSurface, surfaceStore } from './surface';

/**
 * The Bricks Agent bar, always at the very bottom (under the tab bar) as in the UI samples:
 * waveform, "Bricks Agent", what it is doing, a red hang-up button, and a chevron that opens the transcript and a typing box.
 * Tap it and talk. While the agent fills a form or presses a button, the bar says what it is doing and the element glows.
 */
export function AgentDock() {
  const t = useT();
  const ui = useStore(agentUi);
  const glow = useStore(glowStore);
  const { open: canvasOpen, surface: canvas } = useStore(surfaceStore);
  const [text, setText] = useState('');
  const talking = ui.phase !== 'idle';
  const acting = !!glow.key;
  const status = acting ? glow.caption : ui.phase === 'idle' ? t('common.agent.tap') : t(`common.agent.${ui.phase === 'working' ? 'working' : ui.phase}`);

  const submit = () => {
    const v = text;
    setText('');
    void sendText(v);
  };

  return (
    <View style={{ backgroundColor: colors.accentSoft, borderTopWidth: 1, borderColor: colors.accentLine }}>
      {/* State A's dragger: pull up to bring the screen back, or to open the transcript when there is none.
          While the panel is open it has its own handle on the sheet, so this one steps aside. */}
      {canvasOpen ? null : (
        <View style={{ alignItems: 'center', paddingTop: 3 }}>
          <DragHandle label={t('common.agent.canvas.grow')} onRelease={(dy) => { if (dy <= -40) (canvas ? restoreSurface() : togglePanel()); }} />
        </View>
      )}
      {ui.open ? (
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm }}>
          <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {ui.lines.slice(-8).map((l, i) => (
              <Text key={i} style={{ fontSize: 15, color: l.role === 'agent' ? colors.ink : colors.muted, fontWeight: l.role === 'agent' ? '600' : '400', fontStyle: l.role === 'tool' ? 'italic' : 'normal' }}>{l.role === 'person' ? '🗣 ' : l.role === 'tool' ? '⚙ ' : ''}{l.text}</Text>
            ))}
          </ScrollView>
          {ui.notice ? (
            <Pressable onPress={clearNotice} accessibilityRole="button" style={{ paddingVertical: 4 }}>
              <Text style={{ fontSize: 14, color: colors.danger, fontWeight: '600' }}>{t(`common.agent.${ui.notice}`)}</Text>
            </Pressable>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: space.sm }}>
            <TextInput value={text} onChangeText={setText} onSubmitEditing={submit} placeholder={t('common.agent.type')} placeholderTextColor={colors.muted} accessibilityLabel={t('common.agent.type')} style={{ flex: 1, fontSize: 16, color: colors.ink, backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: colors.line }} />
            <Pressable onPress={submit} accessibilityRole="button" accessibilityLabel="Send" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      ) : ui.notice ? (
        <Pressable onPress={clearNotice} accessibilityRole="button" style={{ paddingHorizontal: space.lg, paddingTop: 6 }}>
          <Text style={{ fontSize: 14, color: colors.danger, fontWeight: '600' }}>{t(`common.agent.${ui.notice}`)}</Text>
        </Pressable>
      ) : null}

      {talking && !ui.open && ui.lines.length ? (
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, gap: 2 }} accessibilityLiveRegion="polite">
          {ui.lines.slice(-2).map((l, i) => (
            <Text key={i} numberOfLines={2} style={{ fontSize: 14, color: l.role === 'agent' ? colors.ink : colors.muted, fontWeight: l.role === 'agent' ? '600' : '400', fontStyle: l.role === 'tool' ? 'italic' : 'normal' }}>{l.role === 'person' ? '🗣 ' : l.role === 'tool' ? '⚙ ' : ''}{l.text}</Text>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg, paddingVertical: space.sm }}>
        <Pressable onPress={() => (talking ? togglePanel() : void startTalk({ mic: audioAvailable() }))} accessibilityRole="button" accessibilityLabel={t('common.agent.talk')} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name={talking ? 'pulse' : 'mic-outline'} size={30} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>Bricks Agent</Text>
            <Text style={{ fontSize: 14, color: colors.muted }} numberOfLines={1}>{status}</Text>
          </View>
        </Pressable>
        {talking ? (
          <Pressable onPress={end} accessibilityRole="button" accessibilityLabel={t('common.agent.end')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="call" size={20} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
          </Pressable>
        ) : (
          <Pressable onPress={() => void startTalk({ mic: audioAvailable() })} accessibilityRole="button" accessibilityLabel={t('common.agent.talk')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="mic" size={22} color="#FFFFFF" />
          </Pressable>
        )}
        <Pressable onPress={togglePanel} accessibilityRole="button" accessibilityLabel="Transcript" hitSlop={8}>
          <Ionicons name={ui.open ? 'chevron-down' : 'chevron-up'} size={24} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}
