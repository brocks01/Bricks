import type { EventDetail } from '@/api/types';
import { categoryColor, color, posterColor } from '@/theme';
import { contrastRatio } from '@/theme/contrast';

/**
 * The event page's tint (Luma): the cover's main colour from the server when it
 * keeps our text readable (7:1 for text, 4.5:1 for grey text), otherwise the
 * category's soft colour.
 */
export function pageTint(event: Pick<EventDetail, 'category' | 'cover_color'>): string {
  const fromCover = event.cover_color;
  if (fromCover && /^#[0-9a-fA-F]{6}$/.test(fromCover)) {
    const readable =
      contrastRatio(color.text, fromCover) >= 7 &&
      contrastRatio(color.textSecondary, fromCover) >= 4.5;
    if (readable) return fromCover;
  }
  return categoryColor[event.category].bg;
}

/** The deep colour behind the cover at the top of the event page (Luma). */
export function pageTintStrong(event: Pick<EventDetail, 'category'>): string {
  return posterColor[event.category].to;
}
