import { defineModule } from '../../navigation/registry';
import { channelsChats, channelsNotices } from './pages';

defineModule({
  id: 'channels',
  title: 'Chats and notifications',
  summary: 'Connect Telegram, WhatsApp or text messages to the same Wisdom agent, and read what Wisdom told the person on any channel.',
  keywords: ['telegram', 'whatsapp', 'sms', 'notifications', 'inbox', 'chat'],
  pages: [channelsChats, channelsNotices],
  skills: [],
});
