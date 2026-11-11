import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import { useSettings } from '@/state/settings';
import { currentPath, renderApp, resetAppState, spokenText } from '@/test-utils/renderApp';

/**
 * Iteration 1.1 exit criteria and test cases (iterations/app/1.1-home-kampung.md §6),
 * run through the real router, screens and mock backend.
 */

jest.setTimeout(30_000);

const press = (testID: string) => fireEvent.press(screen.getByTestId(testID));

let openURL: jest.SpyInstance;

beforeEach(async () => {
  jest.clearAllMocks();
  await resetAppState();
  openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
});

/** Lets pending mock requests and React Query updates settle. */
const settle = () => act(async () => {});

describe('Home', () => {
  it('shows the check-in, a walk to join and the medicine reminder under Today', async () => {
    await renderApp('/home');
    expect(await screen.findByText('Did you move yesterday?')).toBeTruthy();
    expect(screen.getByText('Picked for you')).toBeTruthy();
    expect(screen.getByText('Your events')).toBeTruthy();
    expect(screen.getByText(/Take medicine|Blood pressure tablet/)).toBeTruthy();
    expect(screen.getByText('What would you like to do?')).toBeTruthy();
  });

  it('T1: joins a walk from Home in 1 tap', async () => {
    await renderApp('/home');
    const join = await screen.findByTestId(/^event-card-.*-join$/);
    await fireEvent.press(join);
    expect(currentPath()).toMatch(/^\/going\//);
    expect(await screen.findByText("You're going.")).toBeTruthy();
    expect(screen.getByText(/We'll remind you at/)).toBeTruthy();
  });

  it('check-in Yes thanks them; the question goes away', async () => {
    await renderApp('/home');
    await fireEvent.press(await screen.findByTestId('checkin-yes'));
    expect(await screen.findByText(/Well done\. That's 6 days in a row\./)).toBeTruthy();
    await settle();
    expect(screen.queryByText('Did you move yesterday?')).toBeNull();
  });

  it('check-in No offers a walk with company, joinable in one more tap', async () => {
    await renderApp('/home');
    await fireEvent.press(await screen.findByTestId('checkin-no'));
    const suggestion = await screen.findByTestId('checkin-suggestion');
    expect(within(suggestion).getByText(/Want some company today/)).toBeTruthy();
    await fireEvent.press(within(suggestion).getByText("I'm going"));
    expect(await screen.findByText("You're going.")).toBeTruthy();
  });

  it('reminder Done says well done, then shows the next one', async () => {
    await renderApp('/home');
    const card = await screen.findByTestId('next-reminder');
    const first = within(card).getByText(/Take medicine|Blood pressure tablet/).props
      .children as string;
    await fireEvent.press(screen.getByTestId('next-reminder-done'));
    expect(await screen.findByText('Done. Well done.')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText(first)).toBeNull());
  });

  it('reads out the greeting, today and the choices', async () => {
    await renderApp('/home');
    await screen.findByText('Did you move yesterday?');
    await press('topbar-readout');
    // Read sentence by sentence: wait for the last part, then check the whole script.
    await waitFor(() => expect(spokenText()).toContain('Community: join activities near you.'));
    const spoken = spokenText();
    expect(spoken).toMatch(/^Good (morning|afternoon|evening), Raj\./);
    expect(spoken).toContain('did you move yesterday?');
    expect(spoken).toMatch(/Reminder at (8 am: Take medicine|8 pm: Blood pressure tablet)\./);
    expect(spoken).toContain('Community: join activities near you.');
  });
});

describe('Kampung: Happenings', () => {
  it('lists events with the My Circles entry and Start something', async () => {
    await renderApp('/kampung');
    expect(await screen.findByText('Morning walk')).toBeTruthy();
    expect(screen.getByText("You're in 2 Circles")).toBeTruthy();
    expect(screen.getByTestId('kampung-start')).toBeTruthy();
  });

  it("T2: joins from Happenings in 2 taps (card → details → I'm going)", async () => {
    await renderApp('/kampung');
    await fireEvent.press(await screen.findByTestId('event-card-e_walk_bishan-open'));
    expect(screen).toHavePathname('/event/e_walk_bishan');
    expect(await screen.findByText('Hosted by Lim Ah Kow')).toBeTruthy();
    await press('event-join');
    expect(await screen.findByText("You're going.")).toBeTruthy();
  });

  it('T3: Undo on "You\'re going" removes the RSVP and returns to the event', async () => {
    await renderApp('/event/e_taichi');
    expect(await screen.findByText('9 going')).toBeTruthy();
    await press('event-join');
    await screen.findByText("You're going.");
    await press('undo-bar-undo');
    await waitFor(() => expect(currentPath()).toBe('/event/e_taichi'));
    expect(await screen.findByTestId('event-join')).toBeTruthy();
    expect(screen.getByText('9 going')).toBeTruthy();
  });

  it('T4: "Join WhatsApp group" opens the group link', async () => {
    await renderApp('/event/e_taichi');
    await fireEvent.press(await screen.findByTestId('event-join'));
    await fireEvent.press(await screen.findByTestId('going-whatsapp'));
    expect(openURL).toHaveBeenCalledWith('https://chat.whatsapp.com/BishanWalkers');
  });

  it('Done on "You\'re going" goes back to where they came from', async () => {
    await renderApp('/kampung');
    await fireEvent.press(await screen.findByTestId('event-card-e_taichi-join'));
    await fireEvent.press(await screen.findByTestId('going-done'));
    expect(screen).toHavePathname('/kampung');
    expect(await screen.findByTestId('event-card-e_taichi-going')).toBeTruthy();
  });

  it('T6: the Walking filter shows only walks; tapping it again shows everything', async () => {
    await renderApp('/kampung');
    await screen.findByText('Morning walk');
    await press('filter-walk');
    await waitFor(() => expect(screen.queryByText('Tai chi in the park')).toBeNull());
    expect(await screen.findByText('Morning walk')).toBeTruthy();
    expect(screen.getByTestId('filter-walk').props.accessibilityState).toMatchObject({
      selected: true,
    });
    await press('filter-walk');
    expect(await screen.findByText('Tai chi in the park')).toBeTruthy();
  });

  it('Open in Maps opens Google Maps at the place', async () => {
    await renderApp('/event/e_walk_bishan');
    await fireEvent.press(await screen.findByTestId('event-maps'));
    expect(openURL).toHaveBeenCalledWith(expect.stringContaining('google.com/maps/search'));
  });

  it('"I can\'t go any more" asks first, then gives the place up', async () => {
    await renderApp('/event/e_taichi');
    await fireEvent.press(await screen.findByTestId('event-join'));
    await fireEvent.press(await screen.findByTestId('going-done'));
    // Leaving is tucked under More (two deliberate steps, then a confirm).
    await fireEvent.press(await screen.findByTestId('event-more'));
    await fireEvent.press(await screen.findByTestId('event-cant-go'));
    expect(screen.getByText('Give up your place at Tai chi in the park?')).toBeTruthy();
    await press('confirm-yes');
    expect(await screen.findByTestId('event-join')).toBeTruthy();
  });

  it('More: Add to calendar opens a calendar link with the event filled in', async () => {
    await renderApp('/event/e_taichi');
    await fireEvent.press(await screen.findByTestId('event-more'));
    expect(screen.queryByTestId('event-cant-go')).toBeNull();
    await press('event-calendar');
    expect(openURL).toHaveBeenCalledWith(
      expect.stringMatching(/calendar\.google\.com.*text=Tai\+chi\+in\+the\+park/),
    );
  });

  it('shows a plain message for an event that no longer exists', async () => {
    await renderApp('/event/does-not-exist');
    expect(await screen.findByText(/We couldn't find this event/)).toBeTruthy();
    expect(screen.getByTestId('topbar-help')).toBeTruthy();
  });
});

describe('Start Something', () => {
  it('T5: creates an event in one-question steps and publishes it', async () => {
    await renderApp('/kampung');
    await press('kampung-start');
    expect(screen.getByText('Step 1 of 5')).toBeTruthy();
    // Next stays disabled until a choice is made.
    expect(screen.getByTestId('create-next').props.accessibilityState).toMatchObject({
      disabled: true,
    });

    await press('create-category-games');
    await press('create-next');
    await fireEvent.press(screen.getAllByTestId(/^create-day-/)[1]!);
    await press('create-next');
    await press('create-time-10');
    await press('create-next');
    await fireEvent.press(await screen.findByText('Bishan Community Club'));
    await press('create-next');
    expect(screen.getByText('Add a WhatsApp group link?')).toBeTruthy();
    await press('create-link-skip');

    expect(screen.getByText('Check and publish')).toBeTruthy();
    expect(screen.getByText('Bishan Community Club')).toBeTruthy();
    expect(screen.getAllByText('Chess and board games').length).toBeGreaterThan(0);
    await press('create-next');

    expect(await screen.findByText('Published. People can now see it and join.')).toBeTruthy();
    expect(currentPath()).toMatch(/^\/event\/e_new_/);
  });

  it("rejects a link that isn't a WhatsApp group, in plain words", async () => {
    await renderApp('/kampung/create');
    await press('create-category-walk');
    await press('create-next');
    await fireEvent.press(screen.getAllByTestId(/^create-day-/)[1]!);
    await press('create-next');
    await press('create-time-7');
    await press('create-next');
    await press('create-place-other');
    await fireEvent.changeText(screen.getByTestId('create-place-typed'), 'MacRitchie Reservoir');
    await press('create-next');
    await fireEvent.changeText(screen.getByTestId('create-link'), 'www.example.com');
    await press('create-next');
    expect(screen.getByText(/doesn't look like a WhatsApp group link/)).toBeTruthy();
    await fireEvent.changeText(
      screen.getByTestId('create-link'),
      'https://chat.whatsapp.com/AbC123',
    );
    await press('create-next');
    expect(screen.getByText('MacRitchie Reservoir')).toBeTruthy();
  });

  it('every question takes their own answer: something else, another day, another time, somewhere else', async () => {
    await renderApp('/kampung/create');

    // What: "Something else" asks what it is, and Next waits for it.
    await press('create-category-other');
    expect(screen.getByTestId('create-what-typed')).toBeTruthy();
    expect(screen.getByTestId('create-next').props.accessibilityState).toMatchObject({
      disabled: true,
    });
    await fireEvent.changeText(screen.getByTestId('create-what-typed'), 'Mahjong afternoon');
    await press('create-next');

    // Day: "Another day" starts a week ahead; Later moves it by a day and a week.
    await press('create-day-other');
    expect(screen.getByTestId('day-adjuster')).toBeTruthy();
    await press('day-day-later');
    await press('day-week-later');
    expect(screen.getByTestId('day-day-earlier').props.accessibilityState).toMatchObject({
      disabled: false,
    });
    await press('create-next');

    // Time: "Another time" with the big Earlier / Later buttons (10 am → 10:15 am).
    await press('create-time-other');
    expect(screen.getByTestId('time-adjuster-value')).toHaveTextContent('10 am');
    await press('time-minute-later');
    expect(screen.getByTestId('time-adjuster-value')).toHaveTextContent('10:15 am');
    await press('create-next');

    // Where: "Somewhere else" shows the field; Next waits for a place.
    expect(screen.queryByTestId('create-place-typed')).toBeNull();
    await press('create-place-other');
    expect(screen.getByTestId('create-next').props.accessibilityState).toMatchObject({
      disabled: true,
    });
    await fireEvent.changeText(
      screen.getByTestId('create-place-typed'),
      'Block 123 rooftop garden',
    );
    await press('create-next');
    await press('create-link-skip');

    // Their own words become the event's name and place.
    expect(screen.getByTestId('create-title').props.value).toBe('Mahjong afternoon');
    expect(screen.getByText('Block 123 rooftop garden')).toBeTruthy();
    await press('create-next');
    expect(await screen.findByText('Published. People can now see it and join.')).toBeTruthy();
  });

  it("another time today that's too soon says so and holds Next", async () => {
    await renderApp('/kampung/create');
    await press('create-category-walk');
    await press('create-next');
    await press('create-day-other');
    // Back to today with Earlier by a week.
    await press('day-week-earlier');
    expect(screen.getByTestId('day-week-earlier').props.accessibilityState).toMatchObject({
      disabled: true,
    });
    while (!screen.getByTestId('day-day-earlier').props.accessibilityState?.disabled) {
      await press('day-day-earlier');
    }
    await press('create-next');
    await press('create-time-other');
    // Step the time back to just now: too soon.
    const now = new Date();
    const steps = (10 - now.getHours() + 24) % 24;
    for (let i = 0; i < steps; i++) await press('time-hour-earlier');
    expect(screen.getByTestId('create-too-soon')).toBeTruthy();
    expect(screen.getByTestId('create-next').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('Back walks back one step at a time', async () => {
    await renderApp('/kampung/create');
    await press('create-category-walk');
    await press('create-next');
    expect(screen.getByText('Step 2 of 5')).toBeTruthy();
    await press('screen-back');
    expect(screen.getByText('Step 1 of 5')).toBeTruthy();
    // The earlier answer is kept.
    expect(screen.getByTestId('create-category-walk').props.accessibilityState).toMatchObject({
      selected: true,
    });
  });
});

describe('Circles', () => {
  it('My Circles lists yours with WhatsApp, and near ones with Join', async () => {
    await renderApp('/kampung');
    await fireEvent.press(await screen.findByTestId('kampung-my-circles'));
    expect(await screen.findByText('Bishan Walkers')).toBeTruthy();
    await press('club-card-c_walkers-whatsapp');
    expect(openURL).toHaveBeenCalledWith('https://chat.whatsapp.com/BishanWalkers');
    expect(screen.getByText('Toa Payoh Gardeners')).toBeTruthy();
  });

  it('T7: joining a Circle moves it to yours, with Undo', async () => {
    await renderApp('/kampung/circles');
    await fireEvent.press(await screen.findByTestId('club-card-c_gardeners-join'));
    expect(await screen.findByText('You joined Toa Payoh Gardeners.')).toBeTruthy();
    expect(await screen.findByTestId('club-card-c_gardeners-whatsapp')).toBeTruthy();
    await press('undo-bar-undo');
    expect(await screen.findByTestId('club-card-c_gardeners-join')).toBeTruthy();
  });

  it("Circle page shows the captain, what's coming up and the members", async () => {
    await renderApp('/kampung/circle/c_walkers');
    expect(await screen.findByText('Captain: Lim Ah Kow')).toBeTruthy();
    expect(screen.getAllByText('48 members').length).toBeGreaterThan(0);
    expect(screen.getByText('Tai chi in the park')).toBeTruthy();
    await press('circle-whatsapp');
    expect(openURL).toHaveBeenCalled();
  });
});

describe('T8: Help on every new screen', () => {
  it.each([
    '/kampung',
    '/kampung/circles',
    '/kampung/circle/c_walkers',
    '/kampung/create',
    '/event/e_walk_bishan',
  ])('%s has Read it out and Help, and Help opens SOS', async (url) => {
    await renderApp(url);
    expect(await screen.findByTestId('topbar-readout')).toBeTruthy();
    await press('topbar-help');
    expect(screen).toHavePathname('/sos');
  });
});

describe('Tamil', () => {
  it('Happenings and its filters are in Tamil', async () => {
    useSettings.setState({ language: 'ta' });
    await renderApp('/kampung');
    expect(await screen.findByText('நிகழ்வுகள்')).toBeTruthy();
    expect(screen.getByText('நடைப்பயிற்சி')).toBeTruthy();
    expect(screen.getByText('ஒன்றைத் தொடங்கு')).toBeTruthy();
  });
});
