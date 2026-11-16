// The opening animation: the two figures come together (3 seconds). It plays ONLY the very first time the app is opened on this device,
// never on a refresh or a later start. Tap to skip. Skipped when the phone asks for less motion.
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet } from 'react-native';

const BG = '#0E0F14'; // the video's own background, so there is no visible edge
const KEY = 'wisdom.intro.seen';

async function storage() {
  try {
    return (await import('@react-native-async-storage/async-storage')).default;
  } catch {
    return null;
  }
}

/** Mounts only when the intro has never been seen, so the video is not even loaded on every other start. */
export function SplashIntro() {
  const [first, setFirst] = useState<boolean | null>(null); // null = still checking: draw nothing, so a refresh never flashes the logo
  useEffect(() => {
    let alive = true;
    storage()
      .then((st) => st?.getItem(KEY))
      .then((seen) => alive && setFirst(!seen))
      .catch(() => alive && setFirst(false)); // if storage is unavailable, skip rather than show it every time
    return () => {
      alive = false;
    };
  }, []);
  return first ? <Intro /> : null;
}

function Intro() {
  const [show, setShow] = useState(true);
  const done = useRef(false);
  const fade = useMemo(() => new Animated.Value(1), []);
  const player = useVideoPlayer(require('../../assets/brand/intro.mp4'), (p) => {
    p.loop = false;
    p.muted = true;
  });

  const finish = () => {
    if (done.current) return;
    done.current = true;
    void storage().then((st) => st?.setItem(KEY, '1')).catch(() => undefined);
    Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => setShow(false));
  };

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!alive) return;
      if (reduce) finish();
      else player.play();
    });
    const end = player.addListener('playToEnd', finish);
    const safety = setTimeout(finish, 6000); // never trap the user if the video cannot play
    return () => {
      alive = false;
      end.remove();
      clearTimeout(safety);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, { opacity: fade }]} pointerEvents="auto">
      <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityRole="button" accessibilityLabel="Skip the opening animation">
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ wrap: { backgroundColor: BG, zIndex: 999 } });
