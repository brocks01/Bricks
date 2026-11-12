import { fireEvent, screen, within } from 'expo-router/testing-library';

import { mockDb } from '@/api/mock';
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
