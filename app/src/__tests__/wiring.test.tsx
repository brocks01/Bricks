import * as Notifications from 'expo-notifications';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import * as Speech from 'expo-speech';

import { mockDb } from '@/api/mock';
import { currentPath, renderApp, resetAppState } from '@/test-utils/renderApp';

/**
 * Iteration 2.1 (app side): notification buttons and S38, Family status that
 * updates by itself (S10), all through the real router on mock data.
 */

jest.setTimeout(60_000);

/** Pretends the member tapped a notification (or one of its buttons). */
async function respond(data: Record<string, string>, actionIdentifier: string) {
  const listener = (
    Notifications.addNotificationResponseReceivedListener as jest.Mock
  ).mock.calls.at(-1)![0] as (r: unknown) => void;
  await act(async () => {
    listener({
      actionIdentifier,
      notification: { request: { content: { data, body: null } } },
    });
  });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await resetAppState();
});

describe('Notifications', () => {
  it('Yes on the 8 am check-in answers it without opening anything', async () => {
    await renderApp('/home');
    expect(mockDb().getToday().checkin.pending).toBe(true);
    await respond({ kind: 'checkin' }, 'yes');
    await waitFor(() => expect(mockDb().getToday().checkin.pending).toBe(false));
    expect(currentPath()).toBe('/home');
  });

  it('No opens the check-in with a walk to join', async () => {
    await renderApp('/home');
    await respond({ kind: 'checkin' }, 'no');
    await waitFor(() => expect(currentPath()).toBe('/thrive/checkin'));
    expect(await screen.findByTestId('checkin-suggestion')).toBeTruthy();
  });

  it('tapping a reminder opens Reminders and reads it out (S38)', async () => {
    await renderApp('/home');
    await respond({ reminderId: 'r_1' }, Notifications.DEFAULT_ACTION_IDENTIFIER ?? 'default');
    await waitFor(() => expect(currentPath()).toBe('/thrive/reminders'));
    await waitFor(() =>
      expect(Speech.speak).toHaveBeenCalledWith(
        expect.stringMatching(/^Reminders/),
        expect.anything(),
      ),
    );
  });
});

describe('Family view (S10)', () => {
  it('T4: updates to "Dad joined" by itself within ~10 s of his yes', async () => {
    const invite = mockDb().createFamilyInvite({
      senior_name: 'Raj Kumar',
      senior_phone: '+6590000001',
      relation: 'father',
      language: 'ta',
      interests: [],
      add_me_to_safe_circle: true,
    });
    await renderApp('/family');
    expect(await screen.findByText('Waiting for Dad to say yes')).toBeTruthy();

    // Dad taps Yes on WhatsApp (on the server).
    mockDb().acceptFamilyInvite(invite.id);
    for (let s = 0; s < 11; s++) {
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
    }
    expect(await screen.findByText('Dad joined')).toBeTruthy();
    expect(screen.getByTestId(`family-reminder-${invite.id}`)).toBeTruthy();
  });
});

describe('Errors in plain words', () => {
  it('a failed request shows "Try again", and Try again recovers', async () => {
    const getProfile = jest.spyOn(mockDb(), 'getProfile');
    getProfile.mockImplementationOnce(() => {
      throw new Error('server down');
    });
    await renderApp('/profile');
    expect(await screen.findByText("That didn't work. Let's try again.")).toBeTruthy();
    await fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByTestId('profile-given-section')).toBeTruthy();
  });
});
