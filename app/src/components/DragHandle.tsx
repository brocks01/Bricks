import { useRef, useState, type ReactNode } from 'react';
import { PanResponder, type ViewStyle, View } from 'react-native';
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
}

export function DragHandle({ label, onMove, onRelease, children, style }: DragHandleProps) {
  // The callbacks change every render; the responder must not, so it reads them from a box it mutates.
  const cb = useRef<DragHandleProps>({ label }).current;
  cb.onMove = onMove;
  cb.onRelease = onRelease;
  const [live, setLive] = useState(false);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_e, g) => {
        setLive(true);
        cb.onMove?.(g.dy);
      },
      onPanResponderTerminate: () => {
        setLive(false);
        cb.onMove?.(0);
      },
      onPanResponderRelease: (_e, g) => {
        setLive(false);
        cb.onMove?.(0);
        cb.onRelease?.(g.dy);
      },
      // The sheet's own scroll view must not steal the gesture once it has started.
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <View {...pan.panHandlers} style={[{ opacity: live ? 0.7 : 1 }, style]}>
      {/* The bar itself is only the affordance; the expand button next to it does the same job for anyone
          who cannot drag, so this carries a label and no button role. */}
      <View accessible accessibilityLabel={label} style={{ alignSelf: 'center', width: 56, height: 24, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
      </View>
      {children}
    </View>
  );
}
