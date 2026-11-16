import { Image, View } from 'react-native';
import { colors } from '../theme/tokens';

/** The app's own loading: just the logo, still, on the page background. Used for the short moment the app checks who is signed in. Pages loading data use Skeleton.tsx. */
export function AppLoading() {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <Image source={require('../../assets/brand/mark.png')} style={{ width: 72, height: 72 }} resizeMode="contain" />
    </View>
  );
}
