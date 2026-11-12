import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';

import { mockDb } from '@/api/mock';
import { parsePeople } from '@/app/admin/[id]';
import { useBuddy } from '@/state/buddy';
import { currentPath, renderApp, resetAppState } from '@/test-utils/renderApp';

/**
 * Iteration 3.2 (iterations/app/3.2-p1-features.md): the P1 features, in the
 * plan's order.
 */

jest.setTimeout(60_000);

beforeEach(async () => {
  jest.restoreAllMocks();
  await resetAppState();
});

describe('S24 Walk history & trends', () => {
  it('Health → Your walks: week, then month, with totals that match the walks (T1)', async () => {
    await renderApp('/thrive');
    await fireEvent.press(await screen.findByTestId('thrive-last-walk'));
    expect(await screen.findByTestId('screen-walk-history')).toBeTruthy();

    const week = mockDb().walkStats('week');
    const total = await screen.findByTestId('history-total');
    expect(within(total).getByText('This week')).toBeTruthy();
    expect(screen.getAllByTestId(/^history-walk-/)).toHaveLength(week.walks);

    await fireEvent.press(screen.getByTestId('history-month'));
    const month = mockDb().walkStats('month');
    expect(await screen.findByText('Last 4 weeks')).toBeTruthy();
    expect(screen.getAllByTestId(/^history-walk-/)).toHaveLength(month.walks);
    expect(month.walks).toBeGreaterThanOrEqual(9);
    expect(month.distance_m).toBe(month.days.reduce((sum, d) => sum + d.distance_m, 0));
  });

  it('personal bests: the longest walk opens that walk', async () => {
    await renderApp('/thrive/history');
    const { bests } = mockDb().walkStats('week');
    await fireEvent.press(await screen.findByTestId('history-longest'));
    expect(currentPath()).toBe(`/walk/${bests.longest_walk_id}`);
    expect(mockDb().getWalk(bests.longest_walk_id!)!.distance_m).toBe(bests.longest_m);
  });

  it('says it kindly: more than before, or a gentle nudge, never "less"', async () => {
    await renderApp('/thrive/history');
    const s = mockDb().walkStats('week');
    const banner = await screen.findByTestId('history-compare');
    const text = within(banner).getByText(/./).props.children as string;
    if (s.distance_m > s.previous_distance_m && s.previous_distance_m > 0) {
      expect(text).toMatch(/more than last week/);
    } else if (s.distance_m < s.previous_distance_m) {
      expect(text).toBe('A lighter week. A walk today?');
    }
    expect(text).not.toMatch(/less|fewer|worse/i);
  });
});

describe('S19 Group walk feed + Cheers', () => {
  const limWalk = () =>
    mockDb()
      .circleWalks('c_walkers')
      .find((w) => w.owner.id === 'u_lim')!;

  it('members see recent group walks and can cheer one with a tap', async () => {
    await renderApp('/kampung/circle/c_walkers');
    expect(await screen.findByText('Recent group walks')).toBeTruthy();
    const walk = limWalk();
    const card = await screen.findByTestId(`group-walk-${walk.id}`);
    expect(within(card).getByText('Lim')).toBeTruthy();
    expect(within(card).getByText(/^8 people · \d\.\d km · /)).toBeTruthy();

    await fireEvent.press(within(card).getByTestId(`group-walk-${walk.id}-cheer`));
    expect(await screen.findByText('You cheered Lim.')).toBeTruthy();
    expect(limWalk().cheered_by_me).toBe(true);
    expect(await within(card).findByText('Cheered')).toBeTruthy();
  });

  it('a voice cheer: record up to 10 seconds, listen, send', async () => {
    await renderApp('/kampung/circle/c_walkers');
    const walk = limWalk();
    await fireEvent.press(await screen.findByTestId(`group-walk-${walk.id}-voice`));
    await fireEvent.press(await screen.findByTestId('cheer-start'));
    await fireEvent.press(await screen.findByTestId('cheer-stop'));
    expect(await screen.findByTestId('cheer-preview')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('cheer-send'));
    expect(await screen.findByText('Your voice cheer is on its way to Lim.')).toBeTruthy();
    const cheers = mockDb().getWalk(walk.id).cheers;
    expect(cheers.map((c) => [c.by.id, c.kind])).toEqual([['u_raj', 'voice']]);
  });

  it('Raj shares a walk; Lim cheers it; Raj sees the cheer (T2)', async () => {
    const id = mockDb().walkStats('week').last_walk!.id;
    await renderApp(`/walk/${id}`);
    await fireEvent.press(await screen.findByTestId('walk-share'));
    expect(await screen.findByText('Shared with your Circle.')).toBeTruthy();
    expect(mockDb().getWalk(id).visibility).toBe('circle');
    expect(await screen.findByText('No cheers yet.')).toBeTruthy();

    // Lim, on his phone, cheers it; Raj opens the walk again.
    mockDb().cheerAs('u_lim', id);
    await renderApp(`/walk/${id}`);
    expect(await screen.findByText('Lim cheered')).toBeTruthy();
    // It's in the Circle feed now, with its cheer.
    const mine = mockDb()
      .circleWalks('c_walkers')
      .find((w) => w.id === id)!;
    expect(mine.is_mine).toBe(true);
    expect(mine.cheer_count).toBe(1);
  });

  it("someone else's walk shows only its public route, and theirs to cheer (T3)", async () => {
    const walk = limWalk();
    const seen = mockDb().getWalk(walk.id);
    expect(seen.route_polyline).toBeNull();
    expect(seen.can_cheer).toBe(true);
    await renderApp(`/walk/${walk.id}`);
    expect(await screen.findByText("Lim Ah Kow's walk")).toBeTruthy();
    expect(screen.queryByTestId('walk-share')).toBeNull();
    expect(screen.getByTestId('walk-cheer')).toBeTruthy();
  });

  it("isn't shown on a Circle they aren't in", async () => {
    await renderApp('/kampung/circle/c_gardeners');
    await screen.findByTestId('circle-join');
    expect(screen.queryByText('Recent group walks')).toBeNull();
    expect(mockDb().circleWalks('c_gardeners')).toEqual([]);
  });
});

describe('S13 Simple Mode', () => {
  const turnOn = async () => {
    await renderApp('/settings');
    expect(await screen.findByText('Off')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('settings-simple-mode'));
    expect(screen.getByText(/three big buttons: Today, Talk and Help/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('confirm-yes'));
    expect(await screen.findByTestId('screen-home-simple')).toBeTruthy();
  };

  it('Settings → Simple Mode: Home is three big buttons, no tab bar', async () => {
    await turnOn();
    expect(mockDb().getMe().simple_mode).toBe(true);
    expect(screen.getByTestId('simple-today')).toBeTruthy();
    expect(screen.getByTestId('simple-talk')).toBeTruthy();
    expect(screen.getByTestId('simple-help')).toBeTruthy();
    expect(screen.queryByTestId('tab-kampung')).toBeNull();
  });

  it('Today reads the plan and asks the check-in; Help goes to Help', async () => {
    mockDb().updateMe({ simple_mode: true });
    await renderApp('/home');
    await fireEvent.press(await screen.findByTestId('simple-today'));
    expect(await screen.findByTestId('screen-today')).toBeTruthy();
    expect(await screen.findByTestId('checkin-card')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('today-done'));
    await fireEvent.press(await screen.findByTestId('simple-help'));
    expect(await screen.findByTestId('screen-sos')).toBeTruthy();
  });

  it('Talk opens Buddy', async () => {
    mockDb().updateMe({ simple_mode: true });
    await renderApp('/home');
    await fireEvent.press(await screen.findByTestId('simple-talk'));
    expect(useBuddy.getState().listening).toBe(true);
    useBuddy.getState().close();
  });

  it('can be turned off again from Settings', async () => {
    mockDb().updateMe({ simple_mode: true });
    await renderApp('/home');
    await screen.findByTestId('screen-home-simple');
    await fireEvent.press(screen.getByTestId('home-settings'));
    expect(await screen.findByText('On')).toBeTruthy();
    await fireEvent.press(await screen.findByTestId('settings-simple-mode'));
    await fireEvent.press(screen.getByTestId('confirm-yes'));
    await waitFor(() => expect(mockDb().getMe().simple_mode).toBe(false));
    expect(await screen.findByText('Simple Mode is off.')).toBeTruthy();
  });

  it('family turns it on for a parent who joined (S10, T4)', async () => {
    const invite = mockDb().createFamilyInvite({
      senior_name: 'Raj Kumar',
      senior_phone: '+6591234567',
      relation: 'father',
      language: 'en',
      interests: [],
      add_me_to_safe_circle: true,
    });
    mockDb().acceptFamilyInvite(invite.id);
    await renderApp('/family');
    await fireEvent.press(await screen.findByTestId(`family-simple-${invite.id}`));
    expect(await screen.findByText('Simple Mode is on for Dad.')).toBeTruthy();
    expect(mockDb().getFamilyInvites()[0]!.simple_mode).toBe(true);
    expect(await screen.findByText('Turn off Simple Mode for Dad')).toBeTruthy();
  });
});

describe('S11 Admin: members & QR', () => {
  it('reads a pasted list: name, then phone; blank lines skipped', () => {
    expect(parsePeople('Tan Mei Ling, 9123 4567\n\n  Mdm Wong  \n, 8000 0000')).toEqual([
      { name: 'Tan Mei Ling', phone: '+6591234567' },
      { name: 'Mdm Wong', phone: null },
    ]);
  });

  it('staff: Settings → the centre → add a list → show the QR; phones that scan are Joined (T5)', async () => {
    const org = mockDb().createOrg('Toa Payoh CC', true);
    await renderApp('/settings');
    await fireEvent.press(await screen.findByTestId(`settings-org-${org.id}`));
    expect(await screen.findByTestId('screen-admin')).toBeTruthy();
    expect(await screen.findByTestId('admin-verified')).toBeTruthy();
    expect(screen.getByText('No one yet. Add people, or show the QR.')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('admin-add-people'));
    await fireEvent.changeText(
      screen.getByTestId('admin-add-field'),
      'Tan Mei Ling, 9123 4567\nMdm Wong',
    );
    await fireEvent.press(screen.getByTestId('admin-add-submit'));
    expect(await screen.findByText('2 people added.')).toBeTruthy();
    expect(screen.getAllByText('Invited')).toHaveLength(2);

    await fireEvent.press(screen.getByTestId('admin-show-qr'));
    expect(await screen.findByTestId('admin-qr')).toBeTruthy();
    expect(screen.getByTestId('admin-qr-code').props.children).toBe(org.join_code);
    await fireEvent.press(screen.getByTestId('admin-qr-close'));

    // Three phones scan it.
    for (const who of ['u_lim', 'u_tan', 'u_siti']) mockDb().joinOrg(org.join_code, who);
    const detail = mockDb().getOrg(org.id);
    expect(detail.members.filter((m) => m.status === 'joined')).toHaveLength(3);
    // Staff see names and statuses only.
    expect(Object.keys(detail.members[0]!).sort()).toEqual(
      ['id', 'invited_at', 'joined_at', 'name', 'status'].sort(),
    );
  });

  it('settings shows no organisation row to people who run none', async () => {
    await renderApp('/settings');
    await screen.findByTestId('settings-language');
    expect(screen.queryByTestId(/^settings-org-/)).toBeNull();
  });

  it('a member scans the code and is in', async () => {
    await renderApp('/join/BISHAN');
    expect(await screen.findByText("You've joined Bishan Active Ageing Centre.")).toBeTruthy();
    expect(screen.getByText('A verified organisation.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('join-done'));
    expect(await screen.findByTestId('screen-home')).toBeTruthy();
  });

  it('a wrong code says so plainly', async () => {
    await renderApp('/join/NOPE00');
    expect(await screen.findByTestId('join-failed')).toBeTruthy();
    expect(screen.getByText(/We couldn't find that code/)).toBeTruthy();
  });
});

describe('S27 Health Card', () => {
  it('Health → Health card: blood group, conditions, medicines, who to call, private', async () => {
    await renderApp('/thrive');
    await fireEvent.press(await screen.findByTestId('thrive-health-card'));
    expect(await screen.findByTestId('screen-health-card')).toBeTruthy();
    expect(await screen.findByText('Only you and your family can see this.')).toBeTruthy();
    expect(screen.getByText('B+')).toBeTruthy();
    expect(screen.getByText('High blood pressure')).toBeTruthy();
    expect(screen.getByText(/Amlodipine 5 mg/)).toBeTruthy();
    expect(
      within(screen.getByTestId('health-card-contacts')).getByText('Priya Kumar'),
    ).toBeTruthy();
    expect(screen.getByText(/^Updated by Priya, /)).toBeTruthy();
  });

  it('Edit: choose a blood group, change medicines, save', async () => {
    await renderApp('/health-card');
    await fireEvent.press(await screen.findByTestId('health-card-edit'));
    await fireEvent.press(screen.getByTestId('health-card-blood-O+'));
    await fireEvent.changeText(
      screen.getByTestId('health-card-medicines-field'),
      'Amlodipine 10 mg, every morning',
    );
    await fireEvent.press(screen.getByTestId('health-card-save'));
    expect(await screen.findByText('Health card saved.')).toBeTruthy();
    const card = mockDb().getHealthCard();
    expect(card.blood_group).toBe('O+');
    expect(card.medicines).toBe('Amlodipine 10 mg, every morning');
    expect(card.updated_by?.id).toBe('u_raj');
  });
});

describe('S35 Life Stories', () => {
  it("a question from family: tell that story; it's saved and the question is answered", async () => {
    await renderApp('/pass-it-on/story');
    await fireEvent.press(await screen.findByTestId('life-stories-row'));
    expect(await screen.findByTestId('screen-stories')).toBeTruthy();
    expect(await screen.findByText('Thirty years of teaching maths')).toBeTruthy();
    expect(screen.getByText('How did you and Amma meet?')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('stories-answer-q_met_amma'));
    await fireEvent.press(await screen.findByTestId('story-start'));
    await fireEvent.press(await screen.findByTestId('story-stop'));
    await fireEvent.press(await screen.findByTestId('stories-save'));
    expect(await screen.findByText('Your story is saved.')).toBeTruthy();
    const { stories, questions } = mockDb().getStories();
    expect(questions).toEqual([]);
    expect(stories[0]!.title).toBe('How did you and Amma meet?');
    expect(stories[0]!.asked_by?.id).toBe('u_priya');
  });

  it('Record a story from an idea', async () => {
    await renderApp('/stories');
    await fireEvent.press(await screen.findByTestId('stories-record'));
    await fireEvent.press(screen.getByTestId('stories-prompt-festival'));
    await fireEvent.press(screen.getByTestId('story-start'));
    await fireEvent.press(await screen.findByTestId('story-stop'));
    await fireEvent.press(await screen.findByTestId('stories-save'));
    await waitFor(() =>
      expect(mockDb().getStories().stories[0]!.title).toBe('A festival you remember'),
    );
  });

  it('delete asks first', async () => {
    await renderApp('/stories');
    await fireEvent.press(await screen.findByTestId('story-delete-st_teacher'));
    expect(screen.getByText(/Delete "Thirty years of teaching maths"\?/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('confirm-yes'));
    await waitFor(() => expect(mockDb().getStories().stories).toEqual([]));
  });
});

describe('S10 Family overview', () => {
  const joinedParent = () => {
    const invite = mockDb().createFamilyInvite({
      senior_name: 'Raj Kumar',
      senior_phone: '+6591234567',
      relation: 'father',
      language: 'en',
      interests: [],
      add_me_to_safe_circle: true,
    });
    return mockDb().acceptFamilyInvite(invite.id);
  };

  it("shows Dad's week, then his health card and stories; family can ask for a story", async () => {
    const invite = joinedParent();
    await renderApp('/family');
    const overview = await screen.findByTestId(`family-overview-${invite.senior_id}`);
    expect(within(overview).getByText('Dad this week')).toBeTruthy();
    expect(within(overview).getByText('No walks yet this week')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(`family-health-card-${invite.id}`));
    expect(await screen.findByText("Dad's health card")).toBeTruthy();
    expect(await screen.findByText('Only Dad and their family can see this.')).toBeTruthy();
  });

  it('ask Dad a question: it waits on his stories page', async () => {
    const invite = joinedParent();
    await renderApp('/family');
    await fireEvent.press(await screen.findByTestId(`family-stories-${invite.id}`));
    await fireEvent.press(await screen.findByTestId('stories-ask'));
    await fireEvent.changeText(
      screen.getByTestId('stories-question-field'),
      'What was Bishan like in 1980?',
    );
    await fireEvent.press(screen.getByTestId('stories-send'));
    expect(await screen.findByText('Sent. Dad will see your question.')).toBeTruthy();
    expect(
      mockDb()
        .getStories(invite.senior_id!)
        .questions.map((q) => q.text),
    ).toEqual(['What was Bishan like in 1980?']);
  });
});
