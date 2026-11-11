import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { dragSurface, FULL_AT, hideSurface, putAway, releaseSurface, setSurfaceArea, surfaceStore } from '../agent/surface';
import { useStore } from '../core/store';
import { useT } from '../i18n';
import { useCurrentPage } from '../navigation';
import { AgentSheet } from './AgentSheet';

/**
 * The agent area's sheet, mounted once in the root layout over the content area. It is pulled open by hand from the Bricks Agent bar at ANY time
 * (with or without a screen the agent made), follows the hand, and stays at the height it is left at. Below about 10% it is just the peek bar and
 * the Connect/Grow tabs show; above that the tabs are hidden. The app above the sheet is dimmed until it reaches full screen; tapping the dimmed
 * part puts the sheet away without losing the conversation. What is inside the sheet is in AgentSheet.tsx; the drag logic is in agent/surface.ts.
 */
export function AgentSurface() {
  const { open, surface, ratio: rest, live, voice } = useStore(surfaceStore);
  const page = useCurrentPage();
  const t = useT();
  // Moving to another screen closes it. A question asked for the old screen is answered as "closed", so the agent is never left waiting.
  useEffect(() => {
    hideSurface();
  }, [page?.key]);

  // Closed and nobody is pulling it: draw nothing, but keep measuring the area, so the first pull up from the bar knows how tall the area is.
  if (!open && live === null) return <View pointerEvents="none" onLayout={(e) => setSurfaceArea(e.nativeEvent.layout.height)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />;

  const shown = voice ? 1 : live ?? rest;
  const full = shown >= FULL_AT;
  return (
    <View pointerEvents="box-none" onLayout={(e) => setSurfaceArea(e.nativeEvent.layout.height)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' }}>
      {full ? null : <Pressable onPress={putAway} accessibilityRole="button" accessibilityLabel={t('common.agent.close')} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,20,18,0.34)' }} />}
      <View style={{ height: `${Math.round(shown * 100)}%`, maxHeight: '100%' }}>
        <AgentSheet surface={surface} onMove={dragSurface} onRelease={releaseSurface} />
      </View>
    </View>
  );
}
