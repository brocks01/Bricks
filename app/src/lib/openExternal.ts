import { Alert, Linking } from 'react-native';

import i18n from '@/i18n';

/**
 * Opens a WhatsApp group, map or web link. https links open WhatsApp when it is
 * installed and the browser otherwise. If nothing can open it, we say so plainly
 * instead of failing silently.
 */
export async function openExternal(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert(i18n.t('common.couldNotOpen'));
    return false;
  }
}

/** Google Maps search for a place (works on Android and iPhone, app or browser). */
export function mapsUrl(placeName: string, lat?: number, lng?: number): string {
  const query = lat !== undefined && lng !== undefined ? `${lat},${lng}` : placeName;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** WhatsApp group invite links look like https://chat.whatsapp.com/<code>. */
export function isWhatsAppGroupLink(value: string): boolean {
  return /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+\/?$/.test(value.trim());
}
