import { createStore } from '../core/store';

/**
 * Small settings kept on this device: how big the text is and whether the "read aloud" speaker shows. Kept in the device's own storage (never sent anywhere).
 * Text size makes the page bigger on the web; on a phone the phone's own text size setting also applies.
 */
export type TextSize = 'normal' | 'large' | 'larger';
export const ZOOM: Record<TextSize, number> = { normal: 1, large: 1.12, larger: 1.25 };
export interface Prefs { textSize: TextSize; readAloud: boolean }

export const prefs = createStore<Prefs>({ textSize: 'large', readAloud: false });
const KEY = 'bricks.prefs';

async function storage() {
  try {
    return (await import('@react-native-async-storage/async-storage')).default;
  } catch {
    return null;
  }
}

/** Read the saved settings once at start. A missing or damaged value leaves the defaults. */
export async function loadPrefs(): Promise<void> {
  try {
    const raw = await (await storage())?.getItem(KEY);
    if (!raw) return;
    const v = JSON.parse(raw) as Partial<Prefs>;
    prefs.set((s) => ({
      textSize: v.textSize && v.textSize in ZOOM ? v.textSize : s.textSize,
      readAloud: typeof v.readAloud === 'boolean' ? v.readAloud : s.readAloud,
    }));
  } catch {
    /* the defaults stay */
  }
}

export function setPref(patch: Partial<Prefs>): void {
  prefs.set((s) => ({ ...s, ...patch }));
  void storage().then((st) => st?.setItem(KEY, JSON.stringify(prefs.get()))).catch(() => undefined);
}
