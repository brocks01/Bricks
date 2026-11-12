import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Platform, View, type ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';

/**
 * The drag surface on the agent panel - the little bar at the top of a sheet, the way Instagram's comment
 * sheet has one. The person grabs it (or the header next to it) and pulls: the panel follows their finger
 * the whole way, and on release it snaps to the nearest of the three states.
 *
 * The parent decides what the gesture means: `onMove` gets the live offset (0 when it lets go) so the panel
 * can track the finger, and `onRelease` gets the final offset (negative = up). Children are rendered inside
 * the drag area, so a tap on a button there still works - a tap has no movement, so it never starts a drag.
 */
export interface DragHandleProps {
  label: string;
  onMove?: (dy: number) => void;
  onRelease?: (dy: number) => void;
  children?: ReactNode;
  style?: ViewStyle;
  /** No little grab bar: the children themselves are the thing to grab (the Bricks Agent row). */
  bare?: boolean;
}

// Web-only style keys (react-native-web passes them to CSS); ignored on a phone.
// userSelect none and touchAction none: without them a mouse drag SELECTS the header text instead of moving the sheet.
const webDrag = { userSelect: 'none', touchAction: 'none', cursor: 'grab' } as unknown as ViewStyle;

export function DragHandle({ label, onMove, onRelease, children, style, bare }: DragHandleProps) {
  const [live, setLive] = useState(false);

  // Created fresh on every render (a tiny object): the responder's closures always see this render's
  // callbacks, so no ref box is needed and nothing is read during render. The gesture state itself
  // lives in React Native's responder system, not in this object.
  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
    onPanResponderMove: (_e, g) => {
      setLive(true);
      onMove?.(g.dy);
    },
    onPanResponderTerminate: () => {
      setLive(false);
      onMove?.(0);
    },
    onPanResponderRelease: (_e, g) => {
      setLive(false);
      onRelease?.(g.dy); // release first: it reads where the hand left the sheet, then the live offset is cleared
      onMove?.(0);
    },
    // The sheet's own scroll view must not steal the gesture once it has started.
    onPanResponderTerminationRequest: () => false,
  });

  // On the web a mouse does not drive PanResponder reliably, so the web uses pointer events on the element itself. Capture starts only
  // once the pointer has moved a few pixels, so a plain click on a button inside the header still works.
  // The listeners are attached once; the callbacks they call are kept latest through this ref (read at event time, never during render).
  const node = useRef<unknown>(null);
  const latest = useRef({ onMove, onRelease });
  useEffect(() => {
    latest.current = { onMove, onRelease };
  });
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = node.current as HTMLElement | null;
    if (!el || !el.addEventListener) return;
    let startY = 0;
    let down = false;
    let moved = false;
    const onDown = (e: PointerEvent) => {
      if (e.button) return;
      down = true;
      moved = false;
      startY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dy = e.clientY - startY;
      if (!moved) {
        if (Math.abs(dy) < 6) return;
        moved = true;
        try { el.setPointerCapture(e.pointerId); } catch { /* not capturable: the drag still works while over the element */ }
        setLive(true);
      }
      e.preventDefault();
      latest.current.onMove?.(dy);
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      const dy = e.clientY - startY;
      try { el.releasePointerCapture(e.pointerId); } catch { /* nothing captured */ }
      if (!moved) return;
      setLive(false);
      latest.current.onRelease?.(dy); // release first: it reads where the hand left the sheet, then the live offset is cleared
      latest.current.onMove?.(0);
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [node]);

  return (
    <View ref={node as never} {...(Platform.OS === 'web' ? {} : pan.panHandlers)} style={[{ opacity: live ? 0.7 : 1 }, webDrag, style]}>
      {/* The bar is the only control for the height: drag it up or down and the sheet stays where you leave it. */}
      {bare ? null : (
        <View accessible accessibilityLabel={label} style={{ alignSelf: 'center', width: 56, height: 24, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
        </View>
      )}
      {children}
    </View>
  );
}
