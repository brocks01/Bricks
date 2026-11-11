import { View } from 'react-native';
import { AgentControls } from '../components/AgentControls';
import { DragHandle } from '../components/DragHandle';
import { useT } from '../i18n';
import { colors } from '../theme/tokens';
import { dragSurface, releaseSurface } from './surface';

/**
 * The closed agent bar: just the drag handle and the bottom area (keyboard, call). Nothing else. Grab it anywhere and pull up; the sheet follows
 * the hand and stays at the height it is left at. The conversation, the typing line and the call screen are in the sheet (components/AgentSheet.tsx).
 */
export function AgentDock() {
  const t = useT();
  return (
    <View style={{ backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.line }}>
      <DragHandle label={t('common.agent.canvas.grow')} onMove={dragSurface} onRelease={releaseSurface}>
        <AgentControls />
      </DragHandle>
    </View>
  );
}
