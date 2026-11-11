import { ReactNode } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';

// On the web the whole app sits in a phone-sized column in the middle of the page.
// On a real phone (Expo Go or a build) it renders as normal, full screen.
export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web') return <>{children}</>;
  const wide = width > 520;
  return (
    <View style={{ flex: 1, backgroundColor: wide ? '#E9E6DF' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={[
          { width: wide ? 420 : '100%', height: wide ? Math.min(height - 32, 880) : '100%', backgroundColor: '#FBFAF7', overflow: 'hidden' },
          wide && { borderRadius: 28, borderWidth: 1, borderColor: '#D9D5CC', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' },
        ]}
      >
        {children}
      </View>
    </View>
  );
}
