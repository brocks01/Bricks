import { act, fireEvent, screen } from 'expo-router/testing-library';

import { useOnboarding } from '@/state/onboarding';
import { useSettings } from '@/state/settings';
import { renderApp, resetAppState } from '@/test-utils/renderApp';

/**
 * Our Android build: the phone's own speech recogniser (expo-speech-recognition)
 * turns speech into words, so "Say it" works without the backend.
 */
jest.setTimeout(60_000);

type Listener = (event: unknown) => void;
const mockListeners = new Map<string, Set<Listener>>();
const mockSpeech = {
  addListener: (name: string, fn: Listener) => {
    if (!mockListeners.has(name)) mockListeners.set(name, new Set());
    mockListeners.get(name)!.add(fn);
    return { remove: () => mockListeners.get(name)?.delete(fn) };
  },
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
};

jest.mock('expo', () => {
  const actual = jest.requireActual('expo');
  return {
    ...actual,
    requireOptionalNativeModule: (name: string) =>
      name === 'ExpoSpeechRecognition' ? mockSpeech : actual.requireOptionalNativeModule(name),
  };
});

async function emit(name: string, event: unknown = null) {
  await act(async () => {
    mockListeners.get(name)?.forEach((fn) => fn(event));
  });
}

const result = (transcript: string, isFinal: boolean) => ({
  isFinal,
  results: [{ transcript, confidence: 0.9, segments: [] }],
});

beforeEach(() => {
  resetAppState();
  useSettings.setState({ language: 'en' });
  mockSpeech.requestPermissionsAsync.mockResolvedValue({ granted: true });
  mockSpeech.start.mockClear();
  mockSpeech.stop.mockClear();
  mockListeners.clear();
});

async function openNameStep() {
  await renderApp('/onboarding/about');
  await fireEvent.press(await screen.findByTestId('about-say-it'));
  await act(async () => {}); // permission request resolves
}

describe('Say it with the phone recogniser', () => {
  it('shows the words as they are heard and fills the name when they stop', async () => {
    await openNameStep();
    expect(mockSpeech.start).toHaveBeenCalledWith(
      expect.objectContaining({ lang: 'en-SG', interimResults: true }),
    );
    // No demo list while it's really listening.
    expect(screen.queryByTestId('voice-demo')).toBeNull();

    await emit('result', result('Sayan', false));
    expect(await screen.findByText('Sayan')).toBeTruthy();
    await emit('result', result('Sayan Ghosh', true));
    await emit('end');

    expect(useOnboarding.getState().draft.preferredName).toBe('Sayan Ghosh');
    expect(screen.getByTestId('about-name').props.value).toBe('Sayan Ghosh');
  });

  it('listens in the app language', async () => {
    useSettings.setState({ language: 'ta' });
    await openNameStep();
    expect(mockSpeech.start).toHaveBeenCalledWith(expect.objectContaining({ lang: 'ta-IN' }));
  });

  it('nothing heard: says so, offers Try again and the demo list as a fallback', async () => {
    await openNameStep();
    await emit('error', { error: 'no-speech', message: '' });
    await emit('end');

    expect(await screen.findByTestId('listening-retry')).toBeTruthy();
    expect(screen.getByTestId('voice-demo')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('listening-retry'));
    await act(async () => {});
    expect(mockSpeech.start).toHaveBeenCalledTimes(2);
    await emit('result', result('Mei Ling', true));
    expect(useOnboarding.getState().draft.preferredName).toBe('Mei Ling');
  });

  it('Stop keeps what was heard so far', async () => {
    await openNameStep();
    await emit('result', result('Ahmad', false));
    await fireEvent.press(screen.getByTestId('listening-stop'));
    expect(mockSpeech.stop).toHaveBeenCalled();
    await emit('end');
    expect(useOnboarding.getState().draft.preferredName).toBe('Ahmad');
  });

  it('microphone refused: says so plainly', async () => {
    mockSpeech.requestPermissionsAsync.mockResolvedValue({ granted: false });
    await openNameStep();
    expect(mockSpeech.start).not.toHaveBeenCalled();
    expect(await screen.findByTestId('listening-close')).toBeTruthy();
  });
});
