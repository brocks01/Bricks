import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { colors } from '../theme/tokens';

/**
 * The app's own loading: a small logo, softly breathing, on the page background. Used for the short moment the app checks who is signed in.
 * It is small on purpose (not the big opening animation) and shows no content. Pages loading their data use the skeletons in Skeleton.tsx.
 */
export function AppLoading() {
  const v = useState(() => new Animated.Value(0.7))[0];
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 800, useNativeDriver: true }), Animated.timing(v, { toValue: 0.7, duration: 800, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <Animated.Image source={require('../../assets/brand/mark.png')} style={{ width: 64, height: 64, opacity: v, transform: [{ scale: v }] }} />
    </View>
  );
}
