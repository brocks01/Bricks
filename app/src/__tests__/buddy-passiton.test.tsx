import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import * as Speech from 'expo-speech';

import { mockDb } from '@/api/mock';
import { useActiveWalk } from '@/features/walk/activeWalk';
import { useSettings } from '@/state/settings';
import { currentPath, renderApp, resetAppState, spokenText } from '@/test-utils/renderApp';

/**
 * Iteration 1.3: mock Buddy (S36, test tasks T4/T5), Read It Out highlighting
 * (S37), Pass It On (S31–S34) and Share a skill (S32).
 */

jest.setTimeout(60_000);

const press = (testID: string) => fireEvent.press(screen.getByTestId(testID));
const speech = (jest.requireMock('expo-speech') as { __state: { autoFinish: boolean } }).__state;

/** English demo phrases, in order (features/buddy/demoPhrases.ts). */
const SAY = {
  today: 0,
  remind: 1,
  yes: 2,
  no: 3,
  join: 4,
  startWalk: 5,
  stopWalk: 6,
  profile: 7,
  help: 8,
  openSettings: 9,
} as const;

/** Tell me → (mock data) tap what was said. */
async function say(phrase: keyof typeof SAY) {
  await press('tellme');
  await fireEvent.press(await screen.findByTestId(`voice-demo-${SAY[phrase]}`));
}

beforeEach(async () => {
  jest.clearAllMocks();
  await resetAppState();
});

describe('Buddy (S36)', () => {
  it('Tell me is on the main screens, and listens straight away', async () => {
    await renderApp('/home');
    await press('tellme');
    expect(await screen.findByText('Listening…')).toBeTruthy();
    expect(screen.getByText('Demo: tap what was said')).toBeTruthy();
    // Nothing heard (no speech service on mock data): it says so and offers Try again.
    await fireEvent.press(await screen.findByTestId('listening-stop'));
    expect(await screen.findByText("Sorry, I didn't catch that.")).toBeTruthy();
    expect(screen.getByTestId('listening-retry')).toBeTruthy();
    await press('listening-close');
    await waitFor(() => expect(screen.queryByTestId('listening-sheet')).toBeNull());
  });

  it('T4: "remind me to take medicine at 8 am" → confirm → reminder in S26, with Undo', async () => {
    await renderApp('/home');
    const before = mockDb().listReminders().length;
    await say('remind');
    expect(
      await screen.findByText('Every day at 8 am: Take medicine. Is that right?'),
    ).toBeTruthy();
    await press('confirm-yes');
    await waitFor(() => expect(currentPath()).toBe('/thrive/reminders'));
    expect(mockDb().listReminders()).toHaveLength(before + 1);
    expect(await screen.findByText('Reminder set for 8 am.')).toBeTruthy();
    await press('undo-bar-undo');
    await waitFor(() => expect(mockDb().listReminders()).toHaveLength(before));
  });

  it('T5: "help" opens SOS at once, with no question', async () => {
    await renderApp('/thrive');
    await say('help');
    await waitFor(() => expect(currentPath()).toBe('/sos'));
    expect(screen.queryByTestId('confirm-sheet')).toBeNull();
  });

  it('T5 in Tamil: உதவி opens SOS', async () => {
    useSettings.setState({ language: 'ta' });
    await renderApp('/home');
    await press('tellme');
    await fireEvent.press(await screen.findByTestId(`voice-demo-${SAY.help}`));
    await waitFor(() => expect(currentPath()).toBe('/sos'));
  });

  it('"Join the walk" asks first, then joins and shows You\'re going', async () => {
    await renderApp('/home');
    await say('join');
    // The next walk to join (this evening's, or tomorrow morning's).
    expect(
      await screen.findByText(/^Join (Evening|Morning) walk, (Today|Tomorrow), \d+ (am|pm)\?$/),
    ).toBeTruthy();
    await press('confirm-yes');
    expect(await screen.findByText("You're going.")).toBeTruthy();
  });

  it('"No" to the check-in asks first, then suggests a walk with company', async () => {
    await renderApp('/home');
    await say('no');
    expect(await screen.findByText("You didn't move yesterday. Is that right?")).toBeTruthy();
    await press('confirm-yes');
    await waitFor(() => expect(currentPath()).toBe('/thrive/checkin'));
    expect(await screen.findByTestId('checkin-suggestion')).toBeTruthy();
  });

  it('No on the confirmation changes nothing and says so', async () => {
    await renderApp('/home');
    const before = mockDb().listReminders().length;
    await say('remind');
    await fireEvent.press(await screen.findByTestId('confirm-no'));
    expect(mockDb().listReminders()).toHaveLength(before);
    await waitFor(() => expect(spokenText()).toContain("Okay, I didn't change anything."));
  });

  it('"What\'s on today" answers in a bubble, out loud, with Play again', async () => {
    await renderApp('/thrive');
    await say('today');
    const bubble = await screen.findByTestId('buddy-reply-text');
    expect(bubble.props.children).toMatch(/did you move yesterday\?.*Coming up: .+ walk/);
    expect(currentPath()).toBe('/home');
    await waitFor(() => expect(spokenText()).toContain('Coming up:'));
    (Speech.speak as jest.Mock).mockClear();
    await press('buddy-play-again');
    await waitFor(() => expect(Speech.speak).toHaveBeenCalled());
    await press('buddy-close');
  });

  it('start and stop a walk by voice (stop asks "Finish your walk?")', async () => {
    await renderApp('/thrive');
    await say('startWalk');
    await waitFor(() => expect(currentPath()).toBe('/walk/record'));
    expect(useActiveWalk.getState().session).not.toBeNull();
    await press('buddy-close');
    await say('stopWalk');
    expect(await screen.findByText('Finish your walk?')).toBeTruthy();
  });

  it('"Open my profile" shows the profile', async () => {
    await renderApp('/home');
    await say('profile');
    await waitFor(() => expect(currentPath()).toBe('/profile'));
    expect(await screen.findByTestId('screen-profile')).toBeTruthy();
  });

  it('"Open settings" goes there without asking and says where we are', async () => {
    await renderApp('/home');
    await say('openSettings');
    await waitFor(() => expect(currentPath()).toBe('/settings'));
    expect(await screen.findByTestId('screen-settings')).toBeTruthy();
    expect(screen.queryByTestId('buddy-reply')).toBeNull();
    await waitFor(() => expect(spokenText()).toContain('Here is Settings.'));
  });

  it.each([
    ['/home', 'a tab'],
    ['/kampung/create', 'a screen with its own Next button'],
    ['/onboarding', 'onboarding'],
    ['/settings', 'settings'],
  ])('the round Buddy button is on %s (%s)', async (url) => {
    await renderApp(url);
    expect(screen.getByTestId('tellme')).toBeTruthy();
  });

  it.each(['/sos', '/are-you-ok', '/helper-alert?sos=s1&name=Tan&phone=%2B6591234567'])(
    'but not on the safety screen %s',
    async (url) => {
      await renderApp(url);
      expect(screen.queryByTestId('tellme')).toBeNull();
    },
  );
});

describe('Read It Out (S37)', () => {
  it('highlights the part of the screen being read', async () => {
    speech.autoFinish = false;
    await renderApp('/pass-it-on');
    await screen.findByTestId('thanks-prompt-card');
    await screen.findByTestId('my-story-row');
    await press('topbar-readout');
    const speak = Speech.speak as jest.Mock;
    // Finish the sentence being read: the next part (the thank-you prompt) lights up.
    const finishSentence = () =>
      act(async () => {
        speak.mock.calls.at(-1)![1].onDone();
      });
    expect(speak.mock.calls[0]![0]).toBe('Activity.');
    expect(screen.queryByTestId(/^readout-target-.*-active$/)).toBeNull();
    await finishSentence();
    expect(screen.getByTestId('readout-target-prompt-active')).toBeTruthy();
    await finishSentence();
    expect(screen.getByTestId('readout-target-share-active')).toBeTruthy();
    await finishSentence();
    expect(screen.getByTestId('readout-target-given-active')).toBeTruthy();
    await finishSentence();
    await finishSentence();
    expect(screen.queryByTestId('readout-bar')).toBeNull();
  });

  it('reads each screen when it opens if Auto-read is on', async () => {
    useSettings.setState((s) => ({ readOut: { ...s.readOut, autoRead: true } }));
    await renderApp('/thrive');
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(Speech.speak).toHaveBeenCalledWith(expect.stringMatching(/^Health/), expect.anything());
  });
});

describe('Pass It On (S31)', () => {
  it('shows My Story, what I can share, what I have given, badges and thank-yous', async () => {
    await renderApp('/pass-it-on');
    expect(await screen.findByText("How was Tan Mei Ling's Nyonya kueh class?")).toBeTruthy();
    expect(screen.getByTestId('given-stats')).toBeTruthy();
    expect(screen.getByText('Sessions taught')).toBeTruthy();

    // My story (and the badges) on its own page.
    await press('my-story-row');
    const story = await screen.findByTestId('my-story');
    expect(within(story).getByText(/maths teacher for thirty years/)).toBeTruthy();
    expect(within(story).getByText('Chess')).toBeTruthy();
    expect(screen.getByText('Thanked 10 times')).toBeTruthy();
    await press('screen-back');

    // What I can share, on its own page.
    await fireEvent.press(await screen.findByTestId('can-share-row'));
    expect(await screen.findByText('Chess for beginners')).toBeTruthy();
    expect(screen.getByText('Thanked by 10 people')).toBeTruthy();
    await press('screen-back');

    await fireEvent.press(await screen.findByTestId('see-all-thanks'));
    expect(await screen.findByTestId('screen-thanks-wall')).toBeTruthy();
    expect(screen.getAllByTestId(/^wall-t_[a-z_]+$/)).toHaveLength(13);
  });

  it('T8: Share a skill with a date → on Pass It On and as a Kampung event, with Undo', async () => {
    await renderApp('/pass-it-on');
    await fireEvent.press(await screen.findByTestId('can-share-row'));
    await fireEvent.press(await screen.findByTestId('share-skill'));
    await press('share-tag-cooking');
    expect(screen.getByTestId('share-title').props.value).toBe('Cooking with me');
    await press('share-next');
    await press('share-day-1');
    await fireEvent.press(screen.getAllByTestId(/^share-hour-/)[0]!);
    await press('share-next');
    await press('share-place-cc');
    await press('share-next');
    expect(screen.getByText("Free: people don't pay.")).toBeTruthy();
    await press('share-next');
    expect(screen.getByTestId('share-preview')).toBeTruthy();
    expect(screen.getByText(/also appear in Community/)).toBeTruthy();
    await press('share-next');

    expect(await screen.findByText("Shared. It's also in Community now.")).toBeTruthy();
    expect(await screen.findByText('Cooking with me')).toBeTruthy();
    expect(
      mockDb()
        .listEvents(null)
        .some((e) => e.title === 'Cooking with me'),
    ).toBe(true);

    await press('undo-bar-undo');
    await waitFor(() => expect(screen.queryByText('Cooking with me')).toBeNull());
    expect(
      mockDb()
        .listEvents(null)
        .some((e) => e.title === 'Cooking with me'),
    ).toBe(false);
  });

  it('a skill without a date is "Whenever someone asks", and not an event', async () => {
    await renderApp('/pass-it-on/share');
    await press('share-tag-technology');
    await press('share-next');
    await press('share-when-flexible');
    await press('share-next');
    await press('share-place-anywhere');
    await press('share-next');
    await press('share-next');
    await press('share-next');
    expect(await screen.findByText('Shared. People can now see it.')).toBeTruthy();
    const skill = mockDb()
      .getProfile('me')
      .skills.find((s) => s.title === 'Phones and computers with me');
    expect(skill).toMatchObject({ start_at: null, event_id: null, place_name: null });
  });
});

describe('Thank-you prompt (S34)', () => {
  it('Thank in one tap, then the prompt is gone', async () => {
    await renderApp('/pass-it-on');
    await fireEvent.press(await screen.findByTestId('thanks-prompt-open'));
    expect(await screen.findByText("How was Tan Mei Ling's Nyonya kueh class?")).toBeTruthy();
    await press('thank-thumb');
    expect(await screen.findByText("We've told Tan Mei Ling. Thank you.")).toBeTruthy();
    await press('thank-done');
    await screen.findByTestId('my-story-row');
    await waitFor(() => expect(screen.queryByTestId('thanks-prompt-card')).toBeNull());
  });

  it('Say thank you: record, listen back, Send', async () => {
    await renderApp('/thank/e_past_kueh');
    await fireEvent.press(await screen.findByTestId('thank-voice'));
    expect(screen.getByTestId('thank-send').props.accessibilityState).toMatchObject({
      disabled: true,
    });
    await fireEvent.press(await screen.findByTestId('thanks-start'));
    await fireEvent.press(await screen.findByTestId('thanks-stop'));
    expect(await screen.findByTestId('thanks-preview')).toBeTruthy();
    await press('thank-send');
    expect(await screen.findByTestId('thank-sent')).toBeTruthy();
    expect(mockDb().getThanksPrompts()).toHaveLength(0);
  });

  it('Skip removes the prompt without sending anything', async () => {
    await renderApp('/thank/e_past_kueh');
    await fireEvent.press(await screen.findByTestId('thank-skip'));
    await waitFor(() => expect(mockDb().getThanksPrompts()).toHaveLength(0));
  });
});

describe('Profile (S33)', () => {
  it("two clear buttons switch between What I've Given and What I Can Share", async () => {
    await renderApp('/profile');
    expect(await screen.findByText('Verified with Singpass')).toBeTruthy();
    expect(screen.getByText('Thanked for Chess for beginners by 10 people')).toBeTruthy();
    expect(screen.getByTestId('profile-given-section')).toBeTruthy();
    await press('profile-share');
    expect(screen.getByTestId('profile-share-section')).toBeTruthy();
    expect(screen.getByText('Maths homework help')).toBeTruthy();
  });
});

describe('Help and Read it out on every new screen', () => {
  it.each([
    '/pass-it-on',
    '/pass-it-on/share',
    '/pass-it-on/thanks',
    '/pass-it-on/intro',
    '/profile',
    '/thank/e_past_kueh',
  ])('%s', async (url) => {
    await renderApp(url);
    expect(await screen.findByTestId('topbar-readout')).toBeTruthy();
    await press('topbar-help');
    expect(currentPath()).toBe('/sos');
  });
});

describe('T1: Tamil at 200% text on every new screen', () => {
  const { Dimensions } = jest.requireActual<typeof import('react-native')>('react-native');
  const setFontScale = (fontScale: number) => {
    const size = { width: 390, height: 844, scale: 3, fontScale };
    Dimensions.set({ window: size, screen: size });
  };
  beforeEach(() => {
    useSettings.setState({ language: 'ta' });
    setFontScale(2);
  });
  afterEach(() => setFontScale(1));

  it.each([
    ['/pass-it-on', 'என் செயல்பாடு'],
    ['/pass-it-on/share', 'ஒரு திறமையைப் பகிர்'],
    ['/profile', 'என் சுயவிவரம்'],
    ['/thank/e_past_kueh', 'நன்றி சொல்லுங்கள்'],
    ['/settings', 'அமைப்புகள்'],
    ['/family', 'என் குடும்பம்'],
    ['/onboarding/about', 'உங்களை எப்படி அழைக்கலாம்?'],
    ['/onboarding/family', 'என் பெற்றோரைச் சேர்'],
  ])('%s', async (url, title) => {
    await renderApp(url);
    expect((await screen.findAllByText(title)).length).toBeGreaterThan(0);
    // The fixed controls are still there, in Tamil.
    expect(screen.getByText('உதவி')).toBeTruthy();
    expect(screen.getByText('படித்துக் காட்டு')).toBeTruthy();
  });
});
