import { useFocusLive, useSavedState } from '../../../core/useFocusLive';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { cancelBooking, completeBooking, decideBooking, getBookings, getListings, type Booking, type Listing } from '../../../api/wisdom';
import { Empty, ListRow, Panel, Pill, Section } from '../../../components/blocks';
import { Button, ErrorText, Screen } from '../../../components/ui';
import { useStore } from '../../../core/store';
import { useLanguage } from '../../../i18n';
import { usePageData, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { colors, space, type } from '../../../theme/tokens';
import { wisdomMyServices as page } from '../pages';
import { CATEGORY_ICON, money } from '../serviceUi';

/** The person's own services and the booking requests on them, and what they booked. Moved here from the Marketplace tab. */
export default function MyServicesScreen() {
  const w = usePageWords(page);
  const lang = useLanguage();
  const navigate = useNavigate();
  const { status } = useStore(sessionStore);
  const [listings, setListings] = useSavedState<Listing[] | null>('wisdom.mine.listings', null);
  const [bookings, setBookings] = useSavedState<Booking[] | null>('wisdom.mine.bookings', null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now()); // when the page opened: enough to know whether a booking has already happened

  const load = useCallback(() => {
    getListings('', undefined, true).then(setListings).catch(() => setListings([]));
    getBookings().then(setBookings).catch(() => setBookings([]));
  }, []);
  useFocusLive(
    useCallback(() => {
      if (status === 'in') load();
    }, [status, load])
  );

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      load();
    } catch {
      setError(w('failed'));
    }
  };

  const incoming = (bookings ?? []).filter((b) => b.role === 'provider');
  const outgoing = (bookings ?? []).filter((b) => b.role === 'requester');
  const when = (iso: string) => new Date(iso).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const past = (iso: string) => new Date(iso).getTime() < nowMs;
  const statusPill = (s: Booking['status']) => <Pill text={w(`status_${s === 'cancelled' ? 'declined' : s}`)} tone={s === 'requested' ? 'warn' : s === 'accepted' || s === 'done' ? 'soft' : 'quiet'} />;

  usePageData(
    page,
    listings === null || bookings === null
      ? null
      : {
          values: [{ label: w('requests_for_me'), value: String(incoming.filter((b) => b.status === 'requested').length) }],
          images: [],
          lists: [
            {
              label: w('requests_for_me'),
              items: incoming
                .filter((b) => b.status === 'requested')
                .map((b, i) => ({
                  label: `${b.title} · ${b.other_name}`,
                  detail: when(b.starts_at),
                  actions: [
                    { id: `accept${i + 1}`, label: w('accept'), agent: 'confirm' as const, run: () => act(() => decideBooking(b.id, true)) },
                    { id: `decline${i + 1}`, label: w('decline'), agent: 'confirm' as const, run: () => act(() => decideBooking(b.id, false)) },
                  ],
                })),
            },
          ],
          actions: [],
        }
  );

  const bookingCard = (b: Booking) => (
    <Panel key={b.id} tone={b.role === 'provider' && b.status === 'requested' ? 'warn' : undefined}>
      <Text style={[type.h2, { color: colors.ink }]}>{b.title}</Text>
      <Text style={[type.small, { color: colors.muted, marginVertical: space.xs }]}>
        {w('with_name', { name: b.other_name || '—' })} · {when(b.starts_at)} · {w('hours_n', { n: b.hours })}
        {b.agreed_rate ? ` · ${w('per_hour', { price: money(b.agreed_rate, b.currency) })}` : ''}
        {b.community_name ? ` · ${b.community_name}` : ''}
      </Text>
      {statusPill(b.status)}
      <View style={{ marginTop: space.sm, gap: space.sm }}>
        {b.role === 'provider' && b.status === 'requested' ? (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}><Button label={w('accept')} onPress={() => act(() => decideBooking(b.id, true))} /></View>
            <View style={{ flex: 1 }}><Button label={w('decline')} kind="plain" onPress={() => act(() => decideBooking(b.id, false))} /></View>
          </View>
        ) : null}
        {b.role === 'provider' && b.status === 'accepted' && past(b.starts_at) ? <Button label={w('mark_done')} onPress={() => act(() => completeBooking(b.id))} /> : null}
        {(b.status === 'requested' || b.status === 'accepted') && !(b.role === 'provider' && b.status === 'requested') ? <Button label={w('cancel')} kind="plain" onPress={() => act(() => cancelBooking(b.id))} /> : null}
        {b.role === 'requester' && b.status === 'done' ? <Button label={w('endorse_btn')} kind="plain" onPress={() => navigate('wisdom.service', { id: b.listing_id })} /> : null}
      </View>
    </Panel>
  );

  return (
    <Screen back title={w('heading')}>
      <ErrorText>{error}</ErrorText>
      <Section title={w('requests_for_me')}>
        {incoming.length === 0 ? <Empty text={w('no_bookings')} /> : incoming.map(bookingCard)}
      </Section>
      <Section title={w('my_bookings')}>
        {outgoing.length === 0 ? <Empty text={w('no_bookings')} /> : outgoing.map(bookingCard)}
      </Section>
      <Section title={w('my_listings')} action={w('offer_service')} onAction={() => navigate('wisdom.serviceOffer')}>
        {(listings ?? []).length === 0 ? <Empty text={w('no_listings')} /> : null}
        {(listings ?? []).map((l, i) => (
          <ListRow key={l.id} icon={CATEGORY_ICON[l.category]} i={i} title={l.title} sub={l.status === 'paused' ? w('unpause_listing') : `${w('years_exp', { n: l.experience_years })}`} onPress={() => navigate('wisdom.service', { id: l.id })} />
        ))}
      </Section>
    </Screen>
  );
}
