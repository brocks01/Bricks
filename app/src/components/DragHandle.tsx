import { useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import { colors } from '../theme/tokens';

/**
 * The drag handle on the agent panel - the little bar at the top of a sheet, the way Instagram's comment
 * sheet has one. Drag it up to expand, down to put the panel away; a tap on it does nothing, so it can
 * never close the panel by accident.
 *
 * The parent does the moving: `onMove` gets the live offset (so the panel can follow the finger),
 * `onUp`/`onDown` fire only on release and only past a threshold, so a small jitter never changes state.
 */
export interface DragHandleProps {
  label: string;
  onMove?: (dy: number) => void;
  onUp?: () => void;
  onDown?: () => void;
}

const STEP = 40; // how far it must be dragged before it counts as a move between states

export function DragHandle({ label, onMove, onUp, onDown }: DragHandleProps) {
  // The callbacks change every render; the responder must not, so it reads them from a box it mutates.
  const cb = useRef<DragHandleProps>({ label }).current;
  cb.onMove = onMove;
  cb.onUp = onUp;
  cb.onDown = onDown;
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
        if (g.dy <= -STEP) cb.onUp?.();
        else if (g.dy >= STEP) cb.onDown?.();
      },
    })
  ).current;

  return (
    <View
      {...pan.panHandlers}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ alignSelf: 'center', width: 56, height: 24, alignItems: 'center', justifyContent: 'center', opacity: live ? 0.55 : 1 }}
    >
      <View style={{ width: 42, height: 5, borderRadius: 3, backgroundColor: colors.line }} />
    </View>
  );
}
