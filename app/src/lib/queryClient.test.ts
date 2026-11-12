import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { createQueryClient, useAppStateFocus } from './queryClient';

/** Iteration 2.3: changes made on WhatsApp or by phone show up as soon as the app is back. */
describe('useAppStateFocus', () => {
  it('coming back to the app refreshes everything at once (WhatsApp answers, calls)', async () => {
    let onChange: (status: AppStateStatus) => void = () => {};
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      onChange = handler as (status: AppStateStatus) => void;
      return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
    });
    const client = createQueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    renderHook(() => useAppStateFocus(client));
    // Let the effect subscribe.
    await act(async () => {});

    act(() => onChange('background'));
    expect(invalidate).not.toHaveBeenCalled();
    act(() => onChange('active'));
    expect(invalidate).toHaveBeenCalledTimes(1);
    // Already open: no extra refresh.
    act(() => onChange('active'));
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
