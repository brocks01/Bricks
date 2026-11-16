import { Image, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

/**
 * The app's own loading: the logo and the name, still, on the page background. It is deliberately IDENTICAL to the page shell the web shows while the app downloads
 * (app/public/index.html: same logo size, same word, same spacing), so the person sees one loading screen and not two.
 * Used for the short moment the app checks who is signed in. Pages loading their data use the skeletons in Skeleton.tsx.
 */
export function AppLoading() {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, backgroundColor: colors.bg }}>
      <Image source={require('../../assets/brand/mark.png')} style={{ width: 72, height: 72 }} resizeMode="contain" />
      <Text style={{ fontSize: 16, letterSpacing: 0.3, color: colors.muted }}>Interchange</Text>
    </View>
  );
}
