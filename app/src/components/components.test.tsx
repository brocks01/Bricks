import { act, fireEvent, screen } from '@testing-library/react-native';
import * as Speech from 'expo-speech';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import type { CircleSummary, EventSummary } from '@/api/types';
import { renderWithProviders } from '@/test-utils/render';

import {
  Avatar,
  AvatarStack,
  ClubCard,
  DateHeader,
  GroupedList,
  GroupedRow,
  showToast,
  StatusBadge,
  TOAST_DURATION_MS,
  ToastHost,
  ConfirmSheet,
  EmptyState,
  EventCard,
  initials,
  StatCard,
  StatusBanner,
  StepProgress,
  TellMeButton,
  Text,
  UNDO_DURATION_MS,
  UndoBar,
  VoicePlayer,
  YesNo,
} from './index';

const NOW = new Date(2026, 10, 11, 9, 0);

const walk: EventSummary = {
  id: 'e1',
  title: 'Morning walk',
  category: 'walk',
  start_at: new Date(2026, 10, 12, 7, 0).toISOString(),
  end_at: null,
  place_name: 'Bishan Park, Gate 2',
  photo_url: null,
  going_count: 12,
  my_rsvp: null,
  language: 'en',
  whatsapp_link: 'https://chat.whatsapp.com/x',
  host: { id: 'u1', name: 'Raj Kumar', photo_url: null },
};

const circle: CircleSummary = {
  id: 'c1',
  name: 'Bishan Walkers',
  type: 'interest',
  photo_url: null,
  member_count: 48,
  whatsapp_link: 'https://chat.whatsapp.com/x',
  is_member: true,
  next_event: { id: 'e1', title: 'Morning walk', start_at: walk.start_at },
};

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

beforeEach(() => jest.clearAllMocks());

describe('YesNo', () => {
  it('calls the matching handler', async () => {
    const onYes = jest.fn();
    const onNo = jest.fn();
    await renderWithProviders(<YesNo onYes={onYes} onNo={onNo} testID="q" />);
    await fireEvent.press(screen.getByText('Yes'));
    await fireEvent.press(screen.getByText('No'));
    expect(onYes).toHaveBeenCalledTimes(1);
    expect(onNo).toHaveBeenCalledTimes(1);
  });

  it('sits side by side at normal size and stacks at 200%', async () => {
    await renderWithProviders(<YesNo onYes={jest.fn()} onNo={jest.fn()} testID="q" />);
    expect(flat('q').flexDirection).toBe('row');

    await renderWithProviders(<YesNo onYes={jest.fn()} onNo={jest.fn()} testID="big" />, {
      fontScale: 2,
    });
    expect(flat('big').flexDirection).toBe('column');
  });
});

describe('EventCard', () => {
  it('shows when, where and who in plain words, with one button', async () => {
    const onGoing = jest.fn();
    await renderWithProviders(
      <EventCard event={walk} onOpen={jest.fn()} onGoing={onGoing} now={NOW} />,
    );
    expect(screen.getByText('Morning walk')).toBeTruthy();
    expect(screen.getByText('Tomorrow, 7 am')).toBeTruthy();
    expect(screen.getByText('Bishan Park, Gate 2')).toBeTruthy();
    expect(screen.getByText('12 going')).toBeTruthy();
    await fireEvent.press(screen.getByText("I'm going"));
    expect(onGoing).toHaveBeenCalled();
  });

  it('opens details from the card body, separately from the button', async () => {
    const onOpen = jest.fn();
    await renderWithProviders(
      <EventCard event={walk} onOpen={onOpen} onGoing={jest.fn()} now={NOW} />,
    );
    const body = screen.getByTestId('event-card-e1-open');
    expect(body.props.accessibilityLabel).toBe(
      'Morning walk. Tomorrow, 7 am. Bishan Park, Gate 2. 12 going.',
    );
    await fireEvent.press(body);
    expect(onOpen).toHaveBeenCalled();
  });

  it('replaces the button with "You\'re going" once joined', async () => {
    await renderWithProviders(
      <EventCard
        event={{ ...walk, my_rsvp: 'going' }}
        onOpen={jest.fn()}
        onGoing={jest.fn()}
        now={NOW}
      />,
    );
    expect(screen.getByText("You're going")).toBeTruthy();
    expect(screen.queryByText("I'm going")).toBeNull();
  });

  it('says "You\'re hosting" with a Hosting badge on their own event', async () => {
    await renderWithProviders(
      <EventCard
        event={{ ...walk, my_rsvp: 'going' }}
        hosting
        onOpen={jest.fn()}
        onGoing={jest.fn()}
        now={NOW}
      />,
    );
    expect(screen.getByText("You're hosting")).toBeTruthy();
    expect(screen.getByText('Hosting')).toBeTruthy();
  });

  it('uses the right plural in Tamil', async () => {
    await renderWithProviders(
      <EventCard
        event={{ ...walk, going_count: 1 }}
        onOpen={jest.fn()}
        onGoing={jest.fn()}
        now={NOW}
      />,
      { language: 'ta' },
    );
    expect(screen.getByText('1 நபர் வருகிறார்')).toBeTruthy();
    expect(screen.getByText('நாளை, 7 AM')).toBeTruthy();
  });
});

describe('ClubCard', () => {
  it('members get WhatsApp group and See events', async () => {
    const onWhatsApp = jest.fn();
    await renderWithProviders(
      <ClubCard
        circle={circle}
        onOpen={jest.fn()}
        onJoin={jest.fn()}
        onWhatsApp={onWhatsApp}
        now={NOW}
      />,
    );
    expect(screen.getByText('48 members')).toBeTruthy();
    expect(screen.getByText('Next: Morning walk, Tomorrow, 7 am')).toBeTruthy();
    await fireEvent.press(screen.getByText('Join WhatsApp group'));
    expect(onWhatsApp).toHaveBeenCalled();
    expect(screen.getByText('See events')).toBeTruthy();
    expect(screen.queryByText('Join this Circle')).toBeNull();
  });

  it('non-members get one Join button and a calm empty line', async () => {
    const onJoin = jest.fn();
    await renderWithProviders(
      <ClubCard
        circle={{ ...circle, is_member: false, member_count: 1, next_event: null }}
        onOpen={jest.fn()}
        onJoin={onJoin}
        onWhatsApp={jest.fn()}
      />,
    );
    expect(screen.getByText('1 member')).toBeTruthy();
    expect(screen.getByText('No activities planned yet')).toBeTruthy();
    await fireEvent.press(screen.getByText('Join this Circle'));
    expect(onJoin).toHaveBeenCalled();
    expect(screen.queryByText('Join WhatsApp group')).toBeNull();
  });
});

describe('StatCard', () => {
  it('reads as one sentence, including the week', async () => {
    await renderWithProviders(
      <StatCard
        testID="stat"
        label="This week"
        value="8.6"
        unit="km walked"
        sub="4 walks"
        bars={[true, true, false, true, true, false, false].map((done, i) => ({
          label: `D${i}`,
          done,
        }))}
      />,
    );
    expect(screen.getByTestId('stat').props.accessibilityLabel).toBe(
      'This week. 8.6 km walked. 4 walks. 4 of 7 days active',
    );
  });
});

describe('UndoBar', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('announces itself and goes away after 8 seconds', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const onDismiss = jest.fn();
    await renderWithProviders(
      <UndoBar visible message="You joined the walk." onUndo={jest.fn()} onDismiss={onDismiss} />,
    );
    expect(announce).toHaveBeenCalledWith('You joined the walk.');
    await act(async () => {
      jest.advanceTimersByTime(UNDO_DURATION_MS - 1);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('Undo reverses the action and closes the bar', async () => {
    const onUndo = jest.fn();
    const onDismiss = jest.fn();
    await renderWithProviders(
      <UndoBar visible message="Reminder set." onUndo={onUndo} onDismiss={onDismiss} />,
    );
    await fireEvent.press(screen.getByTestId('undo-bar-undo'));
    expect(onUndo).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('renders nothing when hidden', async () => {
    await renderWithProviders(
      <UndoBar visible={false} message="x" onUndo={jest.fn()} onDismiss={jest.fn()} />,
    );
    expect(screen.queryByTestId('undo-bar')).toBeNull();
  });
});

describe('ConfirmSheet', () => {
  it('reads the request back and offers Yes / No', async () => {
    const onYes = jest.fn();
    await renderWithProviders(
      <ConfirmSheet
        visible
        text="Every day at 8 am: take medicine. Is that right?"
        onYes={onYes}
        onNo={jest.fn()}
      />,
    );
    expect(screen.getByText('Every day at 8 am: take medicine. Is that right?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Yes'));
    expect(onYes).toHaveBeenCalled();
  });
});

describe('VoicePlayer', () => {
  it('has a worded Play button and stops Read It Out before playing', async () => {
    await renderWithProviders(
      <VoicePlayer audioUrl="https://x/a.m4a" durationS={12} speakerName="Lim" testID="vp" />,
    );
    expect(screen.getByText('Play')).toBeTruthy();
    expect(screen.getByText('0:12')).toBeTruthy();
    expect(screen.getByTestId('vp-toggle').props.accessibilityLabel).toBe(
      'Play the voice message from Lim',
    );
    await fireEvent.press(screen.getByTestId('vp-toggle'));
    expect(Speech.stop).toHaveBeenCalled();
    const { __players } = jest.requireMock('expo-audio') as {
      __players: { play: jest.Mock }[];
    };
    expect(__players.some((p) => p.play.mock.calls.length > 0)).toBe(true);
  });
});

describe('small pieces', () => {
  it('StepProgress says it in words', async () => {
    await renderWithProviders(<StepProgress step={2} total={3} />);
    expect(screen.getByText('Step 2 of 3')).toBeTruthy();
  });

  it('StatusBanner is announced', async () => {
    await renderWithProviders(
      <StatusBanner tone="success" text="Priya is on her way" testID="s" />,
    );
    expect(screen.getByTestId('s').props.accessibilityLiveRegion).toBe('polite');
  });

  it('EmptyState gives one sentence and one action', async () => {
    const onAction = jest.fn();
    await renderWithProviders(
      <EmptyState
        text="No events near you yet. Start one?"
        actionLabel="Start something"
        onAction={onAction}
      />,
    );
    await fireEvent.press(screen.getByText('Start something'));
    expect(onAction).toHaveBeenCalled();
  });

  it('TellMeButton turns into Stop while listening', async () => {
    await renderWithProviders(<TellMeButton onPress={jest.fn()} listening />);
    expect(screen.getByText('Stop')).toBeTruthy();
  });

  it('Avatar shows initials without a photo', async () => {
    expect(initials('Raj Kumar')).toBe('RK');
    expect(initials('  lim  ')).toBe('L');
    await renderWithProviders(<Avatar name="Lim Ah Kow" />);
    // Decorative: hidden from screen readers because the name is always written beside it.
    expect(screen.getByText('LA', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('LA')).toBeNull();
  });

  it('Text doubles at the 200% preview and never exceeds the cap', async () => {
    await renderWithProviders(<Text testID="t">Hello</Text>, { fontScale: 2 });
    const t = screen.getByTestId('t');
    expect(StyleSheet.flatten(t.props.style).fontSize).toBe(40);
    expect(t.props.maxFontSizeMultiplier).toBe(1);
  });
});

describe('Luma pieces (UI step 1)', () => {
  it('StatusBadge says the status in words', async () => {
    await renderWithProviders(<StatusBadge kind="hosting" />);
    expect(screen.getByText('Hosting')).toBeTruthy();
  });

  it('GroupedRow is one button with its title, subtitle and value read together', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <GroupedList title="You">
        <GroupedRow
          title="Language"
          subtitle="For the app"
          value="English"
          onPress={onPress}
          testID="row"
        />
        <GroupedRow title="Version" value="1.0" testID="info" />
      </GroupedList>,
    );
    const row = screen.getByTestId('row');
    expect(row.props.accessibilityLabel).toBe('Language. For the app. English');
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalled();
    expect(screen.getByText('You')).toBeTruthy();
  });

  it('AvatarStack shows "+N" for people not pictured', async () => {
    const p = (id: string) => ({ id, name: id, photo_url: null });
    await renderWithProviders(<AvatarStack people={[p('a'), p('b'), p('c')]} total={14} max={3} />);
    expect(screen.getByText('+11', { includeHiddenElements: true })).toBeTruthy();
  });

  it('DateHeader: "Tomorrow / weekday"', async () => {
    const tomorrow = new Date(NOW.getTime() + 86_400_000);
    await renderWithProviders(<DateHeader date={tomorrow} now={NOW} />);
    expect(screen.getByText('Tomorrow')).toBeTruthy();
    const weekday = new Intl.DateTimeFormat('en-SG', { weekday: 'long' }).format(tomorrow);
    expect(screen.getByText(` / ${weekday}`)).toBeTruthy();
  });

  it('Toast shows a confirmation, then goes by itself', async () => {
    jest.useFakeTimers();
    await renderWithProviders(<ToastHost />);
    await act(async () => showToast("You're going"));
    expect(screen.getByTestId('toast')).toBeTruthy();
    expect(screen.getByText("You're going")).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(TOAST_DURATION_MS + 500);
    });
    expect(screen.queryByTestId('toast')).toBeNull();
    jest.useRealTimers();
  });

  it('ConfirmSheet reads the question back with Yes / No', async () => {
    const onYes = jest.fn();
    await renderWithProviders(
      <ConfirmSheet
        visible
        text="Leave this event?"
        detail="We'll tell the host."
        onYes={onYes}
        onNo={jest.fn()}
      />,
    );
    expect(screen.getByText('Leave this event?')).toBeTruthy();
    expect(screen.getByText("We'll tell the host.")).toBeTruthy();
    await fireEvent.press(screen.getByTestId('confirm-yes'));
    expect(onYes).toHaveBeenCalled();
  });
});
