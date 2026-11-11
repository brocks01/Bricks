import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
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
 * Starting a call from the closed bar opens the sheet, because the call screen lives in the sheet.
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
    if (!open) openArea(0.5);
    void startTalk({ mic: audioAvailable() });
  };
  const keyboard = () => {
    if (!open) openArea(0.5);
    setTyping(!typing);
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 34, paddingVertical: 10 }}>
      <Pressable onPress={keyboard} accessibilityRole="button" accessibilityLabel={t('common.agent.type')} accessibilityState={{ selected: typing }} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: typing ? colors.accentSoft : colors.bg, borderWidth: 1, borderColor: typing ? colors.accentLine : colors.line, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="keypad-outline" size={22} color={typing ? G : colors.ink} />
      </Pressable>
      <Pressable onPress={call} accessibilityRole="button" accessibilityLabel={hearing ? t('common.agent.end') : t('common.agent.talk')} style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: hearing ? colors.danger : G, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={hearing ? 'phone-hangup' : 'phone'} size={28} color="#FFFFFF" />
      </Pressable>
      <View style={{ width: 44 }} />
    </View>
  );
}
