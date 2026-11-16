import { pageWords } from '../../i18n/words';
import { definePage } from '../../kit/page';
import { CHATS, NOTICES } from './words';

const base = { module: 'channels', requiresAuth: true } as const;

export const channelsNotices = definePage({
  ...base,
  key: 'channels.notices',
  route: '/notices',
  summary: 'What Wisdom told the person on any channel (nudges, someone asking for their guidance, reminders), newest first. Opening it marks everything as seen.',
  keywords: ['notifications', 'inbox', 'messages', 'news', 'missed'],
  elements: { heading: { kind: 'text', summary: 'Notifications.' } },
  strings: pageWords(NOTICES),
});

export const channelsChats = definePage({
  ...base,
  key: 'channels.chats',
  route: '/chats',
  summary: 'Connect Telegram, WhatsApp or text messages, so the same Wisdom agent can talk to the person there, remind them and tell them when someone asks for their guidance.',
  keywords: ['telegram', 'whatsapp', 'sms', 'connect', 'chat', 'phone', 'link'],
  elements: {
    heading: { kind: 'text', summary: 'Connect your chats.' },
    telegram: { kind: 'action', summary: 'Connect Telegram.' },
    whatsapp: { kind: 'action', summary: 'Connect WhatsApp.' },
    sms: { kind: 'action', summary: 'Connect text messages.' },
  },
  strings: pageWords(CHATS),
});
