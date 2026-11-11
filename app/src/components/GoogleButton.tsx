import { View } from 'react-native';

// Phones: Google sign-in on Expo Go is not possible (Google refuses its redirect address). It needs a development build
// with the Android and iOS client ids, so for now the phone app offers the other ways in and this shows nothing.
export const googleAvailable = false;

export function GoogleButton(_props: { onToken: (idToken: string) => void; onError: () => void; locale?: string }) {
  return <View />;
}
