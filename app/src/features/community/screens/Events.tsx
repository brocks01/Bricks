import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { communityAbout, type AboutEvent, type CommunityCard } from '../../../api/communityRules';
import { SkeletonList } from '../../../components/Skeleton';
import { Button, Screen } from '../../../components/ui';
import { useStore } from '../../../core/store';
import { useT } from '../../../i18n';
import { El, usePageData, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { colors, space } from '../../../theme/tokens';
import { EventList } from '../EventList';
import { communityEvents as page } from '../pages';
import { PillButton } from '../ui';

// "See events" from a community card: the community's gatherings, Upcoming and Past, grouped by day, each with I'm going and I'm here.
// Someone not in the community sees what is coming up (titles, times and places), and a leader can create a new event.
export default function Events() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = String(id);
  const w = usePageWords(page);
  const t = useT();
  const go = useNavigate();
  const { status } = useStore(sessionStore);
  const [card, setCard] = useState<CommunityCard | null>(null);
  const [preview, setPreview] = useState<AboutEvent[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    communityAbout(cid).then((a) => { setCard(a.community); setPreview(a.events); setCanManage(a.can_manage); setFailed(false); }).catch(() => setFailed(true));
  }, [cid]);
  useEffect(() => { if (status === 'in' && id) load(); }, [status, id, load]);

  usePageData(page, card ? {
    values: [{ label: w('events'), value: card.name }],
    images: [],
    lists: [{ label: w('upcoming'), items: preview.map((a) => ({ label: a.title, detail: a.location ?? '' })) }],
    actions: canManage ? [{ id: 'createEvent', label: w('createEvent'), run: () => { go('community.newEvent', { id: cid }); } }] : [],
  } : null);

  return (
    <Screen title={card ? `${w('events')} · ${card.name}` : w('events')} back>
      {failed ? (
        <View style={{ gap: space.md }}>
          <Text style={{ fontSize: 18, color: colors.ink }}>{t('rv.failed')}</Text>
          <Button label={t('rv.try_again')} onPress={load} />
        </View>
      ) : !card ? <SkeletonList count={3} /> : (
        <>
          <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: '800', color: colors.ink, marginBottom: space.md }}>{card.name}</Text>
          {canManage ? (
            <View style={{ alignItems: 'flex-start', marginBottom: space.md }}>
              <El page={page} id="createEvent"><PillButton label={w('createEvent')} onPress={() => go('community.newEvent', { id: cid })} /></El>
            </View>
          ) : null}
          <EventList cid={cid} member={card.is_member} preview={preview} eventsUrl={card.events_url} />
        </>
      )}
    </Screen>
  );
}
