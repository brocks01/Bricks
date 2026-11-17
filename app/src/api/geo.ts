import { apiBase } from './client';

/** The map picture of a community's or an event's stored address. The server draws it with its own key; the app never sees a key. */
export const mapImageUrl = (kind: 'community' | 'event', id: string): string => `${apiBase()}/v1/geo/map/${kind}/${encodeURIComponent(id)}.png`;

/** Opens the place in Google Maps (no key needed): the website on a computer, the Maps app on a phone. */
export const openInMapsUrl = (address: string): string => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
