import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { getMarketEvents, type MarketEventCard } from '../../api/market';
import { ChipRow, ListRow, Section } from '../../components/blocks';
import { usePageWords } from '../../kit';
import { useNavigate } from '../../navigation';
import { space } from '../../theme/tokens';
import { marketIndex as page } from './pages';

const INTENTS = ['all', 'earn', 'contribute', 'volunteer', 'enjoy'] as const;

/** What is happening near the person, hosted by Active Ageing Centres, malls and others (we bring people to what exists): market days, volunteering, paid gigs, shows, activities.
 *  Filter by what they want to do there: earn, contribute, volunteer, enjoy. Nothing shows when nothing is planned. */
export function MarketDays() {
  const w = usePageWords(page);
  const go = useNavigate();
  const [intent, setIntent] = useState<(typeof INTENTS)[number]>('all');
  const [events, setEvents] = useState<MarketEventCard[]>([]);
  const [any, setAny] = useState(false);
  useFocusEffect(useCallback(() => {
    getMarketEvents(intent === 'all' ? undefined : intent).then((r) => { setEvents(r); if (intent === 'all') setAny(r.length > 0); }).catch(() => setEvents([]));
  }, [intent]));
  if (!any && !events.length) return null;
  return (
    <Section title={w('nearYou')}>
      <ChipRow options={INTENTS.map((i) => ({ value: i, label: w(`intent_${i}`) }))} value={intent} onChange={setIntent} />
      <View style={{ height: space.sm }} />
      {events.slice(0, 6).map((e) => (
        <ListRow key={e.id} icon={e.i_going ? 'checkmark-circle' : 'storefront-outline'} title={e.title}
          sub={[new Date(e.starts_at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }), e.host ?? e.venue_name, w(`kind_${e.kind}`), e.repeat ? w(`dayRepeat_${e.repeat}`) : ''].filter(Boolean).join(' · ')}
          onPress={() => go('market.day', { id: e.id })} />
      ))}
    </Section>
  );
}
