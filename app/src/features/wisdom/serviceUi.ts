import { ApiError } from '../../api/client';
import type { MarketCategory, MarketTier } from '../../api/wisdom';

// Helpers of the paid-session screens (moved here with them from the Marketplace tab): icons for kinds of service, a money format, and the server's refusals turned into the word that says it.
export const CATEGORY_ICON: Record<MarketCategory, 'color-palette-outline' | 'restaurant-outline' | 'school-outline' | 'construct-outline' | 'musical-notes-outline' | 'fitness-outline' | 'chatbubbles-outline' | 'book-outline' | 'sparkles-outline'> = {
  crafts: 'color-palette-outline',
  cooking: 'restaurant-outline',
  teaching: 'school-outline',
  repair: 'construct-outline',
  music: 'musical-notes-outline',
  wellness: 'fitness-outline',
  advice: 'chatbubbles-outline',
  storytelling: 'book-outline',
  other: 'sparkles-outline',
};

export const money = (n: number, currency = 'SGD'): string => `${currency === 'SGD' ? 'S$' : currency + ' '}${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** The word (a key in wisdom/words.ts, SERVICES) for what the server refused with. */
export function refusalWord(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case 'in_the_past': return 'err_in_the_past';
      case 'duplicate': return 'err_duplicate';
      case 'own_listing': return 'err_own';
      case 'offer_not_allowed': return 'offer_not_allowed';
      case 'too_many_listings': return 'too_many';
      case 'not_found': return 'not_found';
    }
  }
  return 'failed';
}

export const tierWord = (t: MarketTier): string => `tier_${t}`;
export const categoryWord = (c: MarketCategory): string => `cat_${c}`;
