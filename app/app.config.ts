import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * App config for every environment.
 *
 * APP_VARIANT picks the build flavour (set per profile in eas.json):
 *   development → dev client, installs side by side with the demo build
 *   preview     → the demo / judge APK
 *   production  → store build (after the hackathon)
 *
 * Native settings (permissions, background location) are declared here up front,
 * so the Android development build does not need rebuilding when later
 * iterations start using them.
 */

type Variant = 'development' | 'preview' | 'production';

const VARIANT: Variant = (process.env.APP_VARIANT as Variant | undefined) ?? 'development';

const BASE_ID = 'sg.bricks.app';

const NAME_BY_VARIANT: Record<Variant, string> = {
  development: 'Bricks (Dev)',
  preview: 'Bricks',
  production: 'Bricks',
};

const ID_BY_VARIANT: Record<Variant, string> = {
  development: `${BASE_ID}.dev`,
  preview: `${BASE_ID}.preview`,
  production: BASE_ID,
};

// Plain-language reasons, shown by the OS when we ask. Never technical.
const PERMISSION_TEXT = {
  locationWhenInUse: 'So we can draw your walk on the map and show events near you.',
  locationAlways: 'So your walk keeps recording when the screen is off.',
  microphone: 'So you can talk to Buddy and record thank-you messages.',
  contacts: 'So you can choose who to tell if you need help.',
  motion: 'So we can count your steps on a walk.',
} as const;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: NAME_BY_VARIANT[VARIANT],
  slug: 'bricks',
  scheme: VARIANT === 'production' ? 'bricks' : `bricks-${VARIANT}`,
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  // The design system is light-only for now (contrast is tuned for white backgrounds).
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: ID_BY_VARIANT[VARIANT],
  },
  android: {
    package: ID_BY_VARIANT[VARIANT],
    adaptiveIcon: {
      backgroundColor: '#FFFFFF',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // Posture (RightPosture) ships arm64 only; keep every build consistent with it.
    // Revisit when modules/posture lands.
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        image: './assets/splash-icon.png',
        imageWidth: 200,
      },
    ],
    ['expo-audio', { microphonePermission: PERMISSION_TEXT.microphone }],
    'expo-localization',
    'expo-font',
    'expo-secure-store',
    'expo-image',
    'expo-asset',
    [
      'expo-location',
      {
        locationWhenInUsePermission: PERMISSION_TEXT.locationWhenInUse,
        locationAlwaysAndWhenInUsePermission: PERMISSION_TEXT.locationAlways,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    ['expo-contacts', { contactsPermission: PERMISSION_TEXT.contacts }],
    ['expo-sensors', { motionPermission: PERMISSION_TEXT.motion }],
    // Maps in our own Android build need a Google Maps key (Expo Go brings its own).
    // Set GOOGLE_MAPS_ANDROID_API_KEY as an EAS secret; never commit it.
    [
      'react-native-maps',
      { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '' },
    ],
    'expo-notifications',
    // Google sign-in opens in the phone's browser and comes back to the app.
    'expo-web-browser',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    variant: VARIANT,
  },
});
