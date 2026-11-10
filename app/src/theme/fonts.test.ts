import { fontAssets, fontStyleFor } from './fonts';

describe('fontStyleFor', () => {
  it('uses Noto Sans for English and Malay, without a separate fontWeight', () => {
    expect(fontStyleFor('en', 'bold')).toEqual({ fontFamily: 'NotoSans_700Bold' });
    expect(fontStyleFor('ms', 'regular')).toEqual({ fontFamily: 'NotoSans_400Regular' });
  });

  it('uses Noto Sans Tamil for Tamil', () => {
    expect(fontStyleFor('ta', 'semibold')).toEqual({ fontFamily: 'NotoSansTamil_600SemiBold' });
  });

  it('uses the system CJK font with a numeric weight for Mandarin', () => {
    expect(fontStyleFor('zh', 'bold')).toEqual({ fontWeight: '700' });
  });

  it('falls back to system fonts when loading failed', () => {
    expect(fontStyleFor('ta', 'regular', false)).toEqual({ fontWeight: '400' });
  });

  it('every family it returns is actually loaded', () => {
    for (const lang of ['en', 'ms', 'ta'] as const) {
      for (const weight of ['regular', 'semibold', 'bold'] as const) {
        const { fontFamily } = fontStyleFor(lang, weight);
        expect(Object.keys(fontAssets)).toContain(fontFamily);
      }
    }
  });
});
