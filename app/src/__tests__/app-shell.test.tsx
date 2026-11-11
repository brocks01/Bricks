import * as Speech from 'expo-speech';
import { fireEvent, screen } from 'expo-router/testing-library';

import { useSettings } from '@/state/settings';
import { renderApp, resetAppState } from '@/test-utils/renderApp';

// The first render transforms the whole route tree, which is slow on a cold cache.
jest.setTimeout(30_000);

const speechState = (jest.requireMock('expo-speech') as { __state: { autoFinish: boolean } })
  .__state;

describe('app shell', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await resetAppState();
  });

  it('opens on Home with skills, community and health sections in that order', async () => {
    await renderApp();
    expect(screen).toHavePathname('/home');
    const order = screen
      .getAllByTestId(/^home-section-/)
      .map((node) => node.props.testID as string);
    expect(order).toEqual(['home-section-passItOn', 'home-section-kampung', 'home-section-thrive']);
  });

  it('greets the member by their preferred name', async () => {
    await renderApp();
    expect(await screen.findByText(/, Raj$/)).toBeTruthy();
  });

  it('opens each pillar from its Home card', async () => {
    await renderApp();
    await fireEvent.press(screen.getByTestId('home-section-kampung'));
    expect(screen).toHavePathname('/kampung');
    expect(screen.getByTestId('screen-kampung')).toBeTruthy();
  });

  it.each(['/home', '/pass-it-on', '/kampung', '/thrive'])(
    'shows Read it out and Help in fixed places on %s',
    async (url) => {
      await renderApp(url);
      expect(screen.getByTestId('topbar-readout')).toBeTruthy();
      expect(screen.getByTestId('topbar-help')).toBeTruthy();
      // Tab roots have no Back link; the tab bar is the way around.
      expect(screen.queryByTestId('screen-back')).toBeNull();
    },
  );

  it('Help opens the SOS screen with the emergency call first', async () => {
    await renderApp('/thrive');
    await fireEvent.press(screen.getByTestId('topbar-help'));
    expect(screen).toHavePathname('/sos');
    expect(screen.getByText('Call 995 now')).toBeTruthy();
    // SOS has no Help button of its own and no Back link: one job, clear exits.
    expect(screen.queryByTestId('topbar-help')).toBeNull();
    expect(screen.queryByTestId('screen-back')).toBeNull();
  });

  it('Read it out speaks the screen in the member language at a slow rate', async () => {
    speechState.autoFinish = false;
    await renderApp('/kampung');
    await fireEvent.press(screen.getByTestId('topbar-readout'));
    expect(Speech.speak).toHaveBeenCalledWith(
      expect.stringContaining('Community'),
      expect.objectContaining({ language: 'en-SG', rate: 0.85 }),
    );
    // Tapping again stops it.
    expect(screen.getByText('Stop reading')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('topbar-readout'));
    expect(Speech.stop).toHaveBeenCalled();
  });

  it('while reading: Pause, Carry on, Repeat and Slower (S37)', async () => {
    speechState.autoFinish = false;
    await renderApp('/thrive');
    await screen.findByTestId('thrive-start-walk');
    expect(screen.queryByTestId('readout-bar')).toBeNull();
    await fireEvent.press(screen.getByTestId('topbar-readout'));
    expect(screen.getByTestId('readout-bar')).toBeTruthy();
    const speak = Speech.speak as jest.Mock;
    const first = speak.mock.calls[0][0] as string;

    await fireEvent.press(screen.getByTestId('readout-pause'));
    expect(screen.getByText('Carry on')).toBeTruthy();
    speak.mockClear();
    await fireEvent.press(screen.getByTestId('readout-pause'));
    expect(speak).toHaveBeenLastCalledWith(first, expect.anything());

    await fireEvent.press(screen.getByTestId('readout-repeat'));
    expect(speak).toHaveBeenLastCalledWith(first, expect.anything());

    await fireEvent.press(screen.getByTestId('readout-slower'));
    expect(speak).toHaveBeenLastCalledWith(first, expect.objectContaining({ rate: 0.75 }));
    expect(useSettings.getState().readOut.rate).toBe(0.75);

    // Stop is on the Read it out button, where it always is; the bar goes away.
    await fireEvent.press(screen.getByTestId('topbar-readout'));
    expect(screen.queryByTestId('readout-bar')).toBeNull();
  });

  it('switches the whole app to Tamil', async () => {
    useSettings.setState({ language: 'ta' });
    await renderApp('/home');
    // Tab label and Home card both say "Kampung" in Tamil.
    expect(screen.getAllByText('சமூகம்').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('topbar-readout'));
    expect(Speech.speak).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ language: 'ta-IN' }),
    );
  });

  it('opens the component gallery from Home in developer builds, in Tamil at 200%', async () => {
    await renderApp('/home');
    await fireEvent.press(screen.getByTestId('home-dev-gallery'));
    expect(screen).toHavePathname('/dev/components');
    expect(screen.getByText('Morning walk')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('gallery-lang-ta'));
    await fireEvent.press(screen.getByTestId('gallery-scale-2'));
    expect(screen.getByText('காலை நடைப்பயிற்சி')).toBeTruthy();
    expect(screen.getAllByText('நான் வருகிறேன்').length).toBeGreaterThan(0);
    // The app around the gallery stays in English.
    expect(screen.getByText('Read it out')).toBeTruthy();
  });

  it('sends unknown links to a page that leads Home', async () => {
    await renderApp('/no-such-page');
    expect(screen.getByText('Go to Home')).toBeTruthy();
  });
});
