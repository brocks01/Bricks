import { useFocusLive, useSavedState } from '../../../core/useFocusLive';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { getInbox, readAllNotices, type Notice } from '../../../api/wisdom';
import { Empty, ListRow, Pill } from '../../../components/blocks';
import { Screen } from '../../../components/ui';
import { usePageWords } from '../../../kit';
import { channelsNotices as page } from '../pages';

export default function Notices() {
  const w = usePageWords(page);
  const [items, setItems] = useSavedState<Notice[] | null>('notices.items', null);
  useFocusLive(
    useCallback(() => {
      getInbox().then((r) => {
        setItems(r.notifications);
        if (r.unread) void readAllNotices().catch(() => undefined); // opening the page marks everything as seen
      }).catch(() => setItems([]));
    }, [])
  );
  const via = (v: string) => (v === 'telegram' ? w('viaTelegram') : v === 'whatsapp' ? w('viaWhatsapp') : v === 'sms' ? w('viaSms') : w('viaApp'));
  return (
    <Screen title={w('heading')} subtitle={w('intro')} back>
      {items === null ? null : items.length === 0 ? <Empty text={w('none')} /> : items.map((n) => (
        <ListRow key={n.id} icon={n.kind === 'nudge' ? 'walk-outline' : n.kind === 'wisdom' ? 'leaf-outline' : 'notifications-outline'} title={n.body} sub={`${new Date(n.at).toLocaleString()} · ${via(n.via)}`}
          right={n.read ? undefined : <View><Pill text={w('unread')} /></View>} />
      ))}
    </Screen>
  );
}
