/* Global test setup. jest-expo already mocks most Expo native modules. */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
  getAvailableVoicesAsync: jest.fn(() => Promise.resolve([])),
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Fonts load instantly in tests.
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
}));

// A controllable fake audio player (expo-audio's native player isn't available in tests).
jest.mock('expo-audio', () => {
  const players: { play: jest.Mock; pause: jest.Mock; seekTo: jest.Mock; playing: boolean }[] = [];
  return {
    __players: players,
    useAudioPlayer: () => {
      const player = {
        playing: false,
        play: jest.fn(),
        pause: jest.fn(),
        seekTo: jest.fn(() => Promise.resolve()),
      };
      players.push(player);
      return player;
    },
    useAudioPlayerStatus: () => ({
      playing: false,
      currentTime: 0,
      duration: 0,
      didJustFinish: false,
      isLoaded: true,
    }),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
  };
});

// React Native's test preset reports a 200% phone font by default. Start from a normal
// 100% phone; tests that care about large text set it explicitly.
{
  const { Dimensions } = jest.requireActual<typeof import('react-native')>('react-native');
  const size = { width: 390, height: 844, scale: 3, fontScale: 1 };
  Dimensions.set({ window: size, screen: size });
}
