import { act, fireEvent, screen } from 'expo-router/testing-library';

import { renderApp, resetAppState } from '@/test-utils/renderApp';

/**
 * Iteration 3.3 usability fixes (iterations/app/3.3-polish-proof.md §2.1): what a
 * member trips on with long labels (Tamil, Malay) or on a small phone.
 */

jest.setTimeout(30_000);

beforeEach(async () => {
  jest.clearAllMocks();
  await resetAppState();
});

/** Tells a view how big it was laid out, as the phone would. */
const layout = (testID: string, size: { width?: number; height?: number }) =>
  act(async () => {
    fireEvent(screen.getByTestId(testID), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 600, ...size } },
    });
  });

describe('Event row with "I\'m going"', () => {
  it('keeps the button beside the title when there is room', async () => {
    await renderApp('/home');
    const join = await screen.findByTestId(/^event-card-.*-join$/);
    const id = join.props.testID.replace(/^event-card-|-join$/g, '');
    await layout(`event-card-${id}-words`, { width: 180 });
    expect(screen.getByTestId(`event-card-${id}`)).not.toHaveStyle({ flexDirection: 'column' });
  });

  it('moves the button under the title when the title would be squeezed', async () => {
    await renderApp('/home');
    const join = await screen.findByTestId(/^event-card-.*-join$/);
    const id = join.props.testID.replace(/^event-card-|-join$/g, '');
    await layout(`event-card-${id}-words`, { width: 90 });
    expect(screen.getByTestId(`event-card-${id}`)).toHaveStyle({ flexDirection: 'column' });
    // Still one tap to join.
    expect(screen.getByTestId(`event-card-${id}-join`)).toBeTruthy();
  });
});

describe('Home on a small phone', () => {
  it('shows "Picked for you" when everything fits', async () => {
    await renderApp('/home');
    expect(await screen.findByLabelText('Picked for you')).toBeTruthy();
    await layout('screen-home-scroll', { height: 900 });
    await act(async () => {
      fireEvent(screen.getByTestId('screen-home-scroll'), 'contentSizeChange', 360, 880);
    });
    expect(screen.getByLabelText('Picked for you')).toBeTruthy();
  });

  it('drops "Picked for you" rather than scrolling, and keeps it dropped', async () => {
    await renderApp('/home');
    expect(await screen.findByLabelText('Picked for you')).toBeTruthy();
    await layout('screen-home-scroll', { height: 600 });
    await act(async () => {
      fireEvent(screen.getByTestId('screen-home-scroll'), 'contentSizeChange', 360, 700);
    });
    expect(screen.queryByLabelText('Picked for you')).toBeNull();
    // Now it fits: the card must not come back and push it over again.
    await act(async () => {
      fireEvent(screen.getByTestId('screen-home-scroll'), 'contentSizeChange', 360, 560);
    });
    expect(screen.queryByLabelText('Picked for you')).toBeNull();
    // Their own next plan and today's cards are still there.
    expect(screen.getByTestId('your-events')).toBeTruthy();
    expect(screen.getByText('Did you move yesterday?')).toBeTruthy();
  });
});
