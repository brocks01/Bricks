import { router } from 'expo-router';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import * as Speech from 'expo-speech';

import { mockDb } from '@/api/mock';
import { useOnboarding } from '@/state/onboarding';
import { useSettings } from '@/state/settings';
import { currentPath, renderApp, resetAppState } from '@/test-utils/renderApp';

/**
 * Iteration 1.3: onboarding (S1–S9), Family (S10) and Settings (S40),
 * through the real router, screens and mock backend.
 */

jest.setTimeout(60_000);

const press = (testID: string) => fireEvent.press(screen.getByTestId(testID));
const contacts = (
  jest.requireMock('expo-contacts') as {
    __state: { next: { name: string; phone: string } | null };
  }
).__state;

beforeEach(async () => {
  jest.clearAllMocks();
  await resetAppState({ onboarded: false });
  // A fresh install: no language chosen yet.
  useSettings.setState({ language: null });
  contacts.next = { name: 'Priya Kumar', phone: '+65 9000 0003' };
});

describe('Onboarding: Myself (S1 → S8)', () => {
  it('T9: fresh install → Tamil → Myself → Singpass → skips the optional steps → Home', async () => {
    await renderApp('/');
    expect(currentPath()).toBe('/onboarding');
    // "Choose your language" in all four, and the languages in their own scripts.
    expect(screen.getByText('Choose your language')).toBeTruthy();
    expect(screen.getByText('请选择语言')).toBeTruthy();
    expect(screen.getByText('தமிழ்')).toBeTruthy();
    // Buddy is there from the very first screen.
    expect(screen.getByTestId('tellme')).toBeTruthy();

    await press('language-ta');
    expect(useSettings.getState().language).toBe('ta');
    expect(await screen.findByText('யார் அமைக்கிறார்கள்?')).toBeTruthy();
    // The community path isn't built yet, and says so.
    expect(screen.getByTestId('who-community').props.accessibilityState).toMatchObject({
      disabled: true,
    });

    await press('who-self');
    await fireEvent.press(await screen.findByTestId('sign-in-singpass'));

    // S4: Singpass filled in the name and area.
    expect(await screen.findByTestId('screen-onboarding-about')).toBeTruthy();
    expect(screen.getByText('படி 1, மொத்தம் 3')).toBeTruthy();
    expect(screen.getByTestId('about-name').props.value).toBe('Raj');
    await press('about-next');
    expect(screen.getByTestId('about-area-Bishan').props.accessibilityState).toMatchObject({
      selected: true,
    });
    await press('about-next');
    // Interests: nothing chosen, so Next says "Skip for now".
    expect(screen.getByText('இப்போது தவிர்')).toBeTruthy();
    await press('about-next');

    await fireEvent.press(await screen.findByTestId('voice-intro-next'));
    await fireEvent.press(await screen.findByTestId('safe-circle-later'));
    await fireEvent.press(await screen.findByTestId('channel-whatsapp'));

    expect(await screen.findByText('வரவேற்கிறோம், Raj.')).toBeTruthy();
    await press('done-go-home');
    expect(await screen.findByTestId('screen-home')).toBeTruthy();
    expect(useOnboarding.getState().completed).toBe(true);
    expect(router.canGoBack()).toBe(false);

    const me = mockDb().getMe();
    expect(me).toMatchObject({
      preferred_name: 'Raj',
      area_name: 'Bishan',
      channel_pref: 'whatsapp',
    });
  });

  it('answers every step: interests, a voice intro and the Safe Circle are all saved', async () => {
    useSettings.setState({ language: 'en' });
    await renderApp('/onboarding/who');
    await press('who-self');
    await fireEvent.press(await screen.findByTestId('sign-in-phone'));
    await fireEvent.changeText(screen.getByTestId('sign-in-phone-field'), '1234');
    await press('sign-in-phone-next');
    expect(screen.getByText(/doesn't look like a Singapore mobile number/)).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('sign-in-phone-field'), '9123 4567');
    await press('sign-in-phone-next');

    await fireEvent.changeText(await screen.findByTestId('about-name'), 'Siti');
    await press('about-next');
    await press('about-area-other');
    await fireEvent.changeText(screen.getByTestId('about-area-typed'), 'Bedok');
    await press('about-next');
    await press('about-interest-gardening');
    // "Say it instead" on mock data: the facilitator taps what was said.
    await press('about-say-it');
    await fireEvent.press(await screen.findByTestId('voice-demo-0'));
    expect(useOnboarding.getState().draft.interests).toEqual(['gardening', 'walking', 'chess']);
    await press('about-next');

    // S5: record, listen back, Next.
    await fireEvent.press(await screen.findByTestId('intro-start'));
    await fireEvent.press(await screen.findByTestId('intro-stop'));
    expect(await screen.findByTestId('intro-preview')).toBeTruthy();
    await press('voice-intro-next');

    // S6: pick from contacts, mark as family, then remove and Undo.
    await fireEvent.press(await screen.findByTestId('safe-circle-contacts'));
    expect(await screen.findByText('Priya Kumar')).toBeTruthy();
    await press('safe-circle-0-family');
    await press('safe-circle-0-remove');
    await waitFor(() => expect(screen.queryByText('Priya Kumar')).toBeNull());
    await press('undo-bar-undo');
    expect(await screen.findByText('Priya Kumar')).toBeTruthy();
    await press('safe-circle-done');

    await fireEvent.press(await screen.findByTestId('channel-call'));
    expect(await screen.findByText('Welcome, Siti.')).toBeTruthy();

    const me = mockDb().getMe();
    expect(me).toMatchObject({
      preferred_name: 'Siti',
      area_name: 'Bedok',
      interests: ['gardening', 'walking', 'chess'],
      channel_pref: 'call',
    });
    expect(mockDb().getSafeCircle()).toEqual([
      expect.objectContaining({ name: 'Priya Kumar', phone: '+6590000003', is_family: true }),
    ]);
    expect(mockDb().getProfile('me').intro).toMatchObject({
      audio_url: 'file:///recording.m4a',
    });
  });

  it('reopening the app mid-way resumes on the same step', async () => {
    useSettings.setState({ language: 'en' });
    useOnboarding.setState({ resumeAt: '/onboarding/safe-circle', path: 'self' });
    await renderApp('/');
    expect(await screen.findByTestId('screen-onboarding-safe-circle')).toBeTruthy();
  });

  it('S1 reads "Choose your language" out in all four voices', async () => {
    await renderApp('/onboarding');
    await press('topbar-readout');
    await waitFor(() => expect(Speech.speak).toHaveBeenCalledTimes(8));
    const languages = (Speech.speak as jest.Mock).mock.calls.map((c) => c[1].language);
    expect(new Set(languages)).toEqual(new Set(['en-SG', 'ms-MY', 'zh-CN', 'ta-IN']));
  });
});

describe('Onboarding: Family (S9 → S10)', () => {
  it('T7: invite Dad → "Waiting for Dad to say yes" → (demo) "Dad joined" → reminder for Dad', async () => {
    useSettings.setState({ language: 'en' });
    useOnboarding.setState({ path: 'family' });
    await renderApp('/onboarding/sign-in');
    await press('sign-in-google');

    await fireEvent.changeText(await screen.findByTestId('family-name'), 'Raj Kumar');
    await press('family-next');
    expect(screen.getByText("What is Raj Kumar's mobile number?")).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('family-phone'), '9000 0001');
    await press('family-next');
    await press('family-relation-father');
    await press('family-next');
    await press('language-ta');
    await press('family-next');
    await press('family-interest-chess');
    await press('family-next');
    await press('family-add-me-yes');

    // Review, with each answer changeable, and the consent line.
    expect(screen.getByText('Please check')).toBeTruthy();
    expect(screen.getByText('தமிழ்')).toBeTruthy();
    expect(screen.getByText(/Nothing is set up until Raj Kumar says yes/)).toBeTruthy();
    await press('family-next');

    expect(await screen.findByTestId('screen-family')).toBeTruthy();
    expect(currentPath()).toBe('/family');
    expect(useOnboarding.getState().completed).toBe(true);
    expect(await screen.findByText('Waiting for Dad to say yes')).toBeTruthy();
    expect(screen.getByText("You're in Dad's Safe Circle.")).toBeTruthy();
    expect(screen.queryByText('Set a reminder for Dad')).toBeNull();

    const [invite] = mockDb().getFamilyInvites();
    expect(invite).toMatchObject({
      senior_phone: '+6590000001',
      relation: 'father',
      status: 'invited',
    });

    await press(`family-demo-accept-${invite!.id}`);
    expect(await screen.findByText('Dad joined')).toBeTruthy();
    await press(`family-reminder-${invite!.id}`);
    expect(await screen.findByText('This reminder is for Dad.')).toBeTruthy();
  });
});

describe('Settings (S40)', () => {
  beforeEach(async () => {
    await resetAppState();
  });

  it('opens from Home and switches language, with Undo', async () => {
    await renderApp('/home');
    await press('home-settings');
    expect(await screen.findByTestId('screen-settings')).toBeTruthy();
    await press('settings-language');
    await press('language-zh');
    expect(useSettings.getState().language).toBe('zh');
    expect(await screen.findByText('设置')).toBeTruthy();
    await press('undo-bar-undo');
    expect(await screen.findByText('Settings')).toBeTruthy();
    expect(useSettings.getState().language).toBe('en');
  });

  it('sets reading speed, auto-read and the reminder channel', async () => {
    await renderApp('/settings');
    await press('settings-speed-slow');
    expect(useSettings.getState().readOut.rate).toBe(0.75);
    expect(Speech.speak).toHaveBeenLastCalledWith(
      'This is how fast I will read.',
      expect.objectContaining({ rate: 0.75 }),
    );
    await press('settings-autoread-on');
    expect(useSettings.getState().readOut.autoRead).toBe(true);

    await waitFor(() =>
      expect(screen.getByTestId('settings-channel-app').props.accessibilityState).toMatchObject({
        selected: true,
      }),
    );
    await press('settings-channel-whatsapp');
    await waitFor(() => expect(mockDb().getMe().channel_pref).toBe('whatsapp'));
    expect(screen.getByText("We'll remind you by WhatsApp message.")).toBeTruthy();
  });

  it('edits the Safe Circle, which SOS then uses', async () => {
    await renderApp('/settings/safe-circle');
    expect(await screen.findByText('Priya Kumar')).toBeTruthy();
    await press('safe-circle-2-remove');
    await press('safe-circle-type');
    await fireEvent.changeText(screen.getByTestId('safe-circle-name'), 'Siti Nurhaliza');
    await fireEvent.changeText(screen.getByTestId('safe-circle-phone'), '8123 4567');
    await press('safe-circle-add-typed');
    await press('safe-circle-save');
    await waitFor(() =>
      expect(
        mockDb()
          .getSafeCircle()
          .map((m) => m.name),
      ).toEqual(['Priya Kumar', 'Ahmad Rahman', 'Siti Nurhaliza']),
    );
    const alert = mockDb().triggerSos();
    expect(alert.helpers.map((h) => h.name)).toContain('Siti Nurhaliza');
  });

  it('Coming-soon rows are greyed out, and Sign out (asked first) starts again at S1', async () => {
    await renderApp('/settings');
    expect(screen.getAllByText('Coming soon')).toHaveLength(3);
    await press('settings-sign-out');
    expect(screen.getByText(/Sign out\? This also starts the demo again/)).toBeTruthy();
    await press('confirm-yes');
    expect(await screen.findByTestId('screen-onboarding-language')).toBeTruthy();
    expect(useOnboarding.getState().completed).toBe(false);
  });

  it.each([
    '/settings',
    '/settings/language',
    '/settings/safe-circle',
    '/family',
    '/onboarding/who',
  ])('Help and Read it out on %s', async (url) => {
    await renderApp(url);
    expect(await screen.findByTestId('topbar-readout')).toBeTruthy();
    await press('topbar-help');
    expect(currentPath()).toBe('/sos');
  });
});
