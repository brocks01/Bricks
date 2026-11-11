import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { DragHandle } from '../components/DragHandle';
import { useStore } from '../core/store';
import { useT } from '../i18n';
import { glowStore } from '../kit/glow';
import { colors, space } from '../theme/tokens';
import { audioAvailable } from './audio';
import { agentUi, end, startTalk } from './live';
import { dragSurface, openArea, releaseSurface } from './surface';

/**
 * The peek bar (state 1 of ui-samples/12-agent-states.webp): the Bricks Agent, what it is doing, a mic, and an up chevron that opens the area.
 * Pull the bar up by hand to open the area to any height. The conversation, the keyboard and the voice view live in the sheet (components/AgentSheet.tsx).
 * While the agent presses a button or fills a field in the app, the bar says what it is doing and the element glows.
 */
export function AgentDock() {
  const t = useT();
  const ui = useStore(agentUi);
  const glow = useStore(glowStore);
  const talking = ui.phase !== 'idle';
  const acting = !!glow.key;
  const status = ui.notice ? t(`common.agent.${ui.notice}`) : acting ? glow.caption : ui.phase === 'idle' ? t('common.agent.tap') : t(`common.agent.${ui.phase === 'working' ? 'working' : ui.phase}`);

  const mic = () => {
    if (talking) {
      end();
      return;
    }
    openArea(1, true); // voice is the primary input: the listening view opens full screen
    void startTalk({ mic: audioAvailable() });
  };

  return (
    <View style={{ backgroundColor: colors.accentSoft, borderTopWidth: 1, borderColor: colors.accentLine }}>
      <View style={{ alignItems: 'center', paddingTop: 3 }}>
        <DragHandle label={t('common.agent.canvas.grow')} onMove={dragSurface} onRelease={releaseSurface} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.lg, paddingBottom: space.sm }}>
        <Pressable onPress={() => openArea(0.5)} accessibilityRole="button" accessibilityLabel="Bricks Agent" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Ionicons name="sparkles" size={26} color="#1B7F3B" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>Bricks Agent</Text>
            <Text style={{ fontSize: 14, color: ui.notice ? colors.danger : colors.muted }} numberOfLines={1}>{status}</Text>
          </View>
        </Pressable>
        <Pressable onPress={mic} accessibilityRole="button" accessibilityLabel={talking ? t('common.agent.end') : t('common.agent.talk')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: talking ? colors.danger : '#1B7F3B', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={talking ? 'stop' : 'mic'} size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable onPress={() => openArea(0.5)} accessibilityRole="button" accessibilityLabel={t('common.agent.canvas.grow')} hitSlop={8}>
          <Ionicons name="chevron-up" size={24} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}
