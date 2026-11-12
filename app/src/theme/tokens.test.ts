import { contrastRatio } from './contrast';
import { categoryColor, color, maxFontScale, radius, touch, typeScale } from './tokens';

/** docs/02 §5.2: text contrast target 7:1 (AAA), never below 4.5:1. */
describe('colour contrast', () => {
  const AAA = 7;
  const AA = 4.5;

  it.each([
    ['text on bg', color.text, color.bg, AAA],
    ['text on bgSubtle', color.text, color.bgSubtle, AAA],
    ['textSecondary on bg', color.textSecondary, color.bg, AAA],
    ['textSecondary on bgSubtle', color.textSecondary, color.bgSubtle, AAA],
    ['text on the page', color.text, color.canvas, AAA],
    ['textSecondary on the page', color.textSecondary, color.canvas, AAA],
    ['going green on the page', color.badgeGoingText, color.canvas, AA],
    ['text on the olive wash', color.text, color.pageWash, AAA],
    ['textSecondary on the olive wash', color.textSecondary, color.pageWash, AA],
    ['going green on the olive wash', color.badgeGoingText, color.pageWash, AA],
    ['primary on the olive wash', color.primary, color.pageWash, AA],
    ['primary text on bg', color.primary, color.bg, AA],
    ['primary on primarySubtle', color.primary, color.primarySubtle, AA],
    ['white on primary', color.textOnColor, color.primary, AA],
    ['white on primaryPressed', color.textOnColor, color.primaryPressed, AAA],
    ['white on success', color.textOnColor, color.success, AA],
    ['white on sos', color.textOnColor, color.sos, AA],
    ['notice text on notice bg', color.noticeText, color.noticeBg, AA],
    ['going-badge green on its tint', color.success, color.successSubtle, AA],
    ['text on success tint', color.text, color.successSubtle, AAA],
    ['white on the undo bar', color.textOnColor, color.snackbar, AAA],
    ['primary on primarySubtle tab', color.primary, color.primarySubtle, AA],
    ['text on the grey pill', color.text, color.primarySubtle, AAA],
    ['Going badge', color.badgeGoingText, color.badgeGoingBg, AA],
    ['Hosting badge', color.badgeHostingText, color.badgeHostingBg, AA],
    ['Full badge', color.badgeFullText, color.badgeFullBg, AA],
    ['white on the toast', color.textOnColor, color.toastBg, AA],
  ])('%s meets %s:1', (_name, fg, bg, minimum) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(minimum);
  });

  it.each(Object.entries(categoryColor))(
    '%s category art is readable (text on its tint)',
    (_k, c) => {
      expect(contrastRatio(c.fg, c.bg)).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(color.text, c.bg)).toBeGreaterThanOrEqual(AAA);
      // The event page is tinted with it: its grey and green text must still read well.
      expect(contrastRatio(color.textSecondary, c.bg)).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(color.badgeGoingText, c.bg)).toBeGreaterThanOrEqual(AA);
    },
  );

  it('control borders are visible (WCAG 1.4.11, 3:1)', () => {
    expect(contrastRatio(color.borderStrong, color.bg)).toBeGreaterThanOrEqual(3);
  });

  it('computes known reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('rejects malformed colours', () => {
    expect(() => contrastRatio('blue', '#FFFFFF')).toThrow();
  });
});

describe('senior-friendly sizing', () => {
  it('body text is at least 20pt and nothing is below 18pt', () => {
    expect(typeScale.body.size).toBeGreaterThanOrEqual(20);
    for (const style of Object.values(typeScale)) {
      expect(style.size).toBeGreaterThanOrEqual(18);
    }
  });

  it('touch targets are at least 64dp with 16dp gaps', () => {
    expect(touch.min).toBeGreaterThanOrEqual(64);
    expect(touch.gap).toBeGreaterThanOrEqual(16);
    expect(touch.sos).toBeGreaterThan(touch.large);
  });

  it('only the agreed radii exist (Luma-style: pill buttons, rounded panels)', () => {
    expect(radius).toEqual({ card: 24, button: 999, tile: 14, sheet: 28, avatar: 999 });
  });

  it('supports 200% system font', () => {
    expect(maxFontScale).toBeGreaterThanOrEqual(2);
  });
});
