import AsyncStorage from '@react-native-async-storage/async-storage';

import { READ_OUT_RATE, useSettings } from './settings';

const STORAGE_KEY = 'kc.settings';

async function rehydrateWith(stored: unknown) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ state: stored, version: 1 }));
  await useSettings.persist.rehydrate();
}

describe('settings store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSettings.setState({
      language: null,
      readOut: { rate: READ_OUT_RATE.normal, autoRead: false },
    });
  });

  it('starts with no chosen language and a slow reading rate', () => {
    const s = useSettings.getState();
    expect(s.language).toBeNull();
    expect(s.readOut.rate).toBe(READ_OUT_RATE.normal);
  });

  it('persists the chosen language', async () => {
    useSettings.getState().setLanguage('ta');
    await new Promise((r) => setTimeout(r, 0));
    const saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}');
    expect(saved.state.language).toBe('ta');
  });

  it('clamps the reading rate', () => {
    useSettings.getState().setReadOutRate(5);
    expect(useSettings.getState().readOut.rate).toBe(READ_OUT_RATE.max);
    useSettings.getState().setReadOutRate(0);
    expect(useSettings.getState().readOut.rate).toBe(READ_OUT_RATE.min);
  });

  it('restores valid saved settings', async () => {
    await rehydrateWith({ language: 'zh', readOut: { rate: 0.7, autoRead: true } });
    const s = useSettings.getState();
    expect(s.language).toBe('zh');
    expect(s.readOut).toEqual({ rate: 0.7, autoRead: true });
  });

  it('ignores corrupt saved values instead of breaking startup', async () => {
    await rehydrateWith({ language: 'klingon', readOut: { rate: 'fast', autoRead: 'yes' } });
    const s = useSettings.getState();
    expect(s.language).toBeNull();
    expect(s.readOut).toEqual({ rate: READ_OUT_RATE.normal, autoRead: false });
  });
});
