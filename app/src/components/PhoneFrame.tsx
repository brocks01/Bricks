import { ReactNode, useEffect } from 'react';
import { Platform, ScrollView, View, useWindowDimensions } from 'react-native';

// The website always looks like the app. On a desktop (a window wider than 520 px) the whole app sits in ONE fixed phone-sized screen,
// 390 x 844 (an iPhone), in the middle of the page: it never stretches with the window. If the window is shorter than the phone the page
// scrolls, not the app. On a real phone, or a narrow window, it fills the screen like an installed app. On a phone the page itself
// cannot be pinch-zoomed or pulled (that would break the app-like feel). On a native phone (Expo Go or a build) this is a plain pass-through.
export const PHONE_WIDTH = 390;
export const PHONE_HEIGHT = 844;

export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    document.body.style.overscrollBehavior = 'none'; // no rubber-band pull of the whole page
    document.documentElement.style.overscrollBehavior = 'none';
  }, []);

  if (Platform.OS !== 'web') return <>{children}</>;
  const wide = width > 520;
  if (!wide) return <View style={{ flex: 1, backgroundColor: '#FBFAF7' }}>{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#E9E6DF' }} contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 }} showsVerticalScrollIndicator={false}>
      <View
        style={{
          width: PHONE_WIDTH,
          height: PHONE_HEIGHT,
          backgroundColor: '#FBFAF7',
          overflow: 'hidden',
          borderRadius: 32,
          borderWidth: 1,
          borderColor: '#D9D5CC',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        }}
      >
        {children}
      </View>
    </ScrollView>
  );
}
