/* Global test setup. jest-expo already mocks most Expo native modules. */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Speech finishes each sentence straight away (so whole scripts get read), unless a
// test sets `__state.autoFinish = false` to look at the Pause / Repeat / Slower bar.
jest.mock('expo-speech', () => {
  const state = { autoFinish: true };
  return {
    __state: state,
    speak: jest.fn((_text: string, options?: { onDone?: () => void }) => {
      if (state.autoFinish) void Promise.resolve().then(() => options?.onDone?.());
    }),
    stop: jest.fn(() => Promise.resolve()),
    isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
    getAvailableVoicesAsync: jest.fn(() => Promise.resolve([])),
  };
});

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
    createAudioPlayer: jest.fn(() => ({
      play: jest.fn(),
      remove: jest.fn(),
      setPlaybackRate: jest.fn(),
      addListener: jest.fn(),
    })),
    // Recording: starts and stops instantly; every clip is 5 seconds long.
    RecordingPresets: { HIGH_QUALITY: {} },
    requestRecordingPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    useAudioRecorder: () => {
      const recorder = {
        isRecording: false,
        uri: null as string | null,
        prepareToRecordAsync: jest.fn(() => Promise.resolve()),
        record: jest.fn(() => {
          recorder.isRecording = true;
        }),
        stop: jest.fn(() => {
          recorder.isRecording = false;
          recorder.uri = 'file:///recording.m4a';
          return Promise.resolve();
        }),
        getStatus: () => ({ durationMillis: 5000, isRecording: recorder.isRecording }),
      };
      return recorder;
    },
    useAudioRecorderState: () => ({ isRecording: false, durationMillis: 0, canRecord: true }),
  };
});

// The phone's contact picker: returns whoever a test puts in `__nextContact`.
jest.mock('expo-contacts', () => {
  const state: { next: { name: string; phone: string } | null } = {
    next: { name: 'Priya Kumar', phone: '+65 9000 0003' },
  };
  return {
    __state: state,
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    Contact: {
      presentPicker: jest.fn(() =>
        Promise.resolve(
          state.next
            ? {
                getFullName: () => Promise.resolve(state.next!.name),
                getPhones: () => Promise.resolve([{ number: state.next!.phone }]),
              }
            : null,
        ),
      ),
    },
  };
});

// React Native's test preset reports a 200% phone font by default. Start from a normal
// 100% phone; tests that care about large text set it explicitly.
{
  const { Dimensions } = jest.requireActual<typeof import('react-native')>('react-native');
  const size = { width: 390, height: 844, scale: 3, fontScale: 1 };
  Dimensions.set({ window: size, screen: size });
}

// Maps are native views; in tests they render as plain views with their children.
jest.mock('react-native-maps', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const MapView = (props: object) => require('react').createElement(View, props);
  const Shape = () => null;
  return { __esModule: true, default: MapView, Polyline: Shape, Circle: Shape, Marker: Shape };
});

jest.mock('expo-keep-awake', () => ({
  useKeepAwake: jest.fn(),
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(),
}));

// Local notifications: record what gets scheduled so tests can check it.
jest.mock('expo-notifications', () => {
  const scheduled = new Map<string, unknown>();
  return {
    __scheduled: scheduled,
    SchedulableTriggerInputTypes: {
      DAILY: 'daily',
      WEEKLY: 'weekly',
      DATE: 'date',
      TIME_INTERVAL: 'timeInterval',
    },
    AndroidImportance: { HIGH: 4 },
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
    setNotificationCategoryAsync: jest.fn(() => Promise.resolve()),
    getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, canAskAgain: true })),
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    getAllScheduledNotificationsAsync: jest.fn(() =>
      Promise.resolve([...scheduled.keys()].map((identifier) => ({ identifier }))),
    ),
    scheduleNotificationAsync: jest.fn((req: { identifier?: string }) => {
      const id = req.identifier ?? `n${scheduled.size + 1}`;
      scheduled.set(id, req);
      return Promise.resolve(id);
    }),
    cancelScheduledNotificationAsync: jest.fn((id: string) => {
      scheduled.delete(id);
      return Promise.resolve();
    }),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  };
});

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
