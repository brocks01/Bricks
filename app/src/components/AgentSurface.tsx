import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { agentUi } from '../agent/live';
import { dragSurface, FULL_AT, hideSurface, openArea, putAway, releaseSurface, setSurfaceArea, surfaceStore } from '../agent/surface';
import { useStore } from '../core/store';
import { useT } from '../i18n';
import { useCurrentPage } from '../navigation';
import { colors, radius, space } from '../theme/tokens';
import { AgentSheet, SurfaceMessage, Warning } from './AgentSheet';

/**
 * The agent's layer over the content area, mounted once in the root layout. THREE things can be here, never more:
 *  - nothing (the closed bar is below, in AppTabBar), only measuring the area so the first pull up knows how tall it is;
 *  - the sheet, pulled up by hand to any height (the app above is dimmed until full screen; tapping the dim puts the sheet away, keeping the chat);
 *  - a pop-up: the sheet was dragged to the bottom while the agent's screen is still unanswered and unclosed, so that screen comes up as a card on the app
 *    until it is answered, closed with its X, or the agent closes it.
 * What is inside the sheet is AgentSheet.tsx; the drag logic is agent/surface.ts.
 */
export function AgentSurface() {
  const { open, surface, ratio: rest, live } = useStore(surfaceStore);
  const ui = useStore(agentUi);
  const page = useCurrentPage();
  const t = useT();
  // Moving to another screen closes it. A question asked for the old screen is answered as "closed", so the agent is never left waiting.
  useEffect(() => {
    hideSurface();
  }, [page?.key]);
  // A reason the call or the microphone did not work is shown in the sheet, so open it rather than say nothing.
  useEffect(() => {
    if (ui.notice && !open && live === null) openArea(0.5);
  }, [ui.notice, open, live]);

  const measure = { onLayout: (e: { nativeEvent: { layout: { height: number } } }) => setSurfaceArea(e.nativeEvent.layout.height) };
  const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

  if (!open && live === null) {
    if (!surface) return <View pointerEvents="none" {...measure} style={fill} />;
    return (
      <View {...measure} style={[fill, { backgroundColor: 'rgba(15,20,18,0.34)', justifyContent: 'center', padding: space.lg }]}>
        <View style={{ maxHeight: '88%', backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.accentLine, overflow: 'hidden' }}>
          <View style={{ alignItems: 'flex-end', paddingHorizontal: space.md, paddingTop: space.md }}>
            <Pressable onPress={hideSurface} accessibilityRole="button" accessibilityLabel={t('common.agent.close')} hitSlop={12}>
              <Ionicons name="close" size={26} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: space.md, paddingTop: space.sm }} showsVerticalScrollIndicator={false}>
            <SurfaceMessage surface={surface} />
          </ScrollView>
          <Warning />
        </View>
      </View>
    );
  }

  const shown = live ?? rest;
  const full = shown >= FULL_AT;
  return (
    <View pointerEvents="box-none" {...measure} style={[fill, { justifyContent: 'flex-end' }]}>
      {full ? null : <Pressable onPress={putAway} accessibilityRole="button" accessibilityLabel={t('common.agent.close')} style={[fill, { backgroundColor: 'rgba(15,20,18,0.34)' }]} />}
      <View style={{ height: `${Math.round(shown * 100)}%`, maxHeight: '100%' }}>
        <AgentSheet surface={surface} onMove={dragSurface} onRelease={releaseSurface} />
      </View>
    </View>
  );
}
