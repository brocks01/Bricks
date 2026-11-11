import { categoryColor } from '@/theme';

import { pageTint } from './tint';

describe('pageTint', () => {
  it('uses the category colour when there is no cover colour', () => {
    expect(pageTint({ category: 'walk', cover_color: null })).toBe(categoryColor.walk.bg);
    expect(pageTint({ category: 'music' })).toBe(categoryColor.music.bg);
  });

  it('uses a light cover colour from the server', () => {
    expect(pageTint({ category: 'walk', cover_color: '#F6E7D8' })).toBe('#F6E7D8');
  });

  it('ignores a cover colour that would make text hard to read', () => {
    expect(pageTint({ category: 'games', cover_color: '#7A1E1E' })).toBe(categoryColor.games.bg);
    expect(pageTint({ category: 'games', cover_color: 'red' })).toBe(categoryColor.games.bg);
  });
});
