import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { AgentControls } from '../components/AgentControls';
import { DragHandle } from '../components/DragHandle';
import { useStore } from '../core/store';
import { useT } from '../i18n';
import { colors } from '../theme/tokens';
import { agentUi, clearNotice } from './live';
import { dragSurface, releaseSurface } from './surface';

/**
 * The closed agent bar: just the drag handle and the bottom area (keyboard, call). Nothing else. Grab it anywhere and pull up; the sheet follows
 * the hand and stays at the height it is left at. The conversation, the typing line and the call screen are in the sheet (components/AgentSheet.tsx).
 */
export function AgentDock() {
  const t = useT();
  const { notice } = useStore(agentUi);
  useEffect(() => {
    if (!notice) return;
    const h = setTimeout(clearNotice, 7000); // the reason shows for a few seconds, then goes
    return () => clearTimeout(h);
  }, [notice]);
  return (
    <View style={{ backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.line }}>
      {notice ? <Text accessibilityLiveRegion="polite" style={{ fontSize: 13, color: colors.danger, fontWeight: '600', textAlign: 'center', paddingTop: 8, paddingHorizontal: 16 }}>{t(`common.agent.${notice}`)}</Text> : null}
      <DragHandle label={t('common.agent.canvas.grow')} onMove={dragSurface} onRelease={releaseSurface}>
        <AgentControls />
      </DragHandle>
    </View>
  );
}
