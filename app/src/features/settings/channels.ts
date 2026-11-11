import type { ChannelPref } from '@/api/types';
import { BellIcon, PhoneIcon, WhatsappLogoIcon, type Icon } from '@/components/primitives/icons';

/** How we remind them (S7, Settings): app notification, WhatsApp message or phone call. */
export const CHANNELS: readonly ChannelPref[] = ['app', 'whatsapp', 'call'];

export const CHANNEL_ICON: Record<ChannelPref, Icon> = {
  app: BellIcon,
  whatsapp: WhatsappLogoIcon,
  call: PhoneIcon,
};
