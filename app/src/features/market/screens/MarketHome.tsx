// The Market tab, kept very simple: the next market day, a few things near you, and one button to list something.
// Search and filters live one tap away, on the "More" page.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { getMarketEvents, type MarketEventCard } from '../../../api/market';
import { Screen } from '../../../components/ui';
import { useStore } from '../../../core/store';
import { languageStore } from '../../../i18n/store';
import { usePageData, usePageWords } from '../../../kit';
import type { PageDataAction } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { colors, radius, space, type } from '../../../theme/tokens';
import { EVENT_PHOTO } from '../photos';
import { marketIndex as page } from '../pages';

const LOCALE: Record<string, string> = { en: 'en-SG', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-SG', zh: 'zh-SG', ms: 'ms-SG' };
const ORANGE = '#C8562A'; // the market's colour in the deck
const KIND: Record<MarketEventCard['kind'], { word: string; icon: keyof typeof Ionicons.glyphMap; tint: string; ink: string }> = {
  market_day: { word: 'm_k_market_day', icon: 'storefront-outline', tint: '#FBEBDD', ink: ORANGE },
  volunteer: { word: 'm_k_volunteer', icon: 'heart-outline', tint: '#E3F1E7', ink: '#17684A' },
  gig: { word: 'm_k_gig', icon: 'cash-outline', tint: '#E4EEF8', ink: '#1F4E9E' },
  show: { word: 'm_k_show', icon: 'musical-notes-outline', tint: '#E8E6F8', ink: '#4B3FA0' },
  activity: { word: 'm_k_activity', icon: 'sparkles-outline', tint: '#E6F4E1', ink: '#3F7A2A' },
};

export default function MarketHome() {
  const w = usePageWords(page);
  const go = useNavigate();
  const { code } = useStore(languageStore);
  const { status } = useStore(sessionStore);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);
  const locale = LOCALE[code] ?? 'en-SG';
  const [events, setEvents] = useState<MarketEventCard[] | undefined>(undefined); // undefined = loading

  // Loads every time the tab comes into view, so what was just added shows without a reload.
  useFocusEffect(
    useCallback(() => {
      if (status !== 'in') return;
      let live = true;
      getMarketEvents()
        .then((r) => { if (live) { setEvents(r); setFailed(false); } })
        .catch(() => { if (live) setFailed(true); }); // a failed request is not the same as "nothing planned"
      return () => { live = false; };
    }, [status, tries]),
  );

  const upcoming = (events ?? []).filter((e) => new Date(e.starts_at).getTime() > Date.now() - 6 * 3600000).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const day = upcoming.find((e) => e.kind === 'market_day');
  const near = upcoming.filter((e) => e !== day).slice(0, 6);
  const days = day ? Math.max(0, Math.ceil((new Date(day.starts_at).getTime() - Date.now()) / 86400000)) : 0;
  const daysText = days === 0 ? w('m_today') : days === 1 ? w('m_one_day') : w('m_days', { n: days });
  const when = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}`;
  };

  const actions: PageDataAction[] = [
    ...(day ? [{ id: 'openMarketDay', label: w('m_open'), run: () => { go('market.day', { id: day.id }); } }] : []),
    ...near.map((e, k) => ({ id: `event${k + 1}`, label: e.title, run: () => { go('market.day', { id: e.id }); } })),
    { id: 'listSomething', label: w('m_list'), run: () => { go('wisdom.serviceOffer'); } },
    { id: 'moreNearby', label: w('m_more'), run: () => { go('market.more'); } },
  ];
  usePageData(page, events !== undefined ? {
    values: [{ label: w('m_title'), value: day ? `${day.title}, ${when(day.starts_at)}, ${day.venue_name}. ${daysText}` : w('m_none') }],
    images: [],
    lists: [{ label: w('m_near'), items: near.map((e) => ({ label: e.title, detail: `${w(KIND[e.kind].word)} · ${e.venue_name} · ${when(e.starts_at)}` })) }],
    actions,
  } : null);

  return (
    <Screen
      title=""
      hero={(
        <View style={{ marginBottom: space.lg }}>
          <Text accessibilityRole="header" style={{ fontSize: 30, fontWeight: '800', color: colors.navy }}>{w('m_title')}</Text>
          <Text style={[type.body, { color: colors.muted, marginTop: 2 }]}>{w('m_sub')}</Text>
        </View>
      )}
    >
      {failed ? (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, marginBottom: space.md }}>
          <Text style={[type.body, { color: colors.danger }]}>{w('m_failed')}</Text>
          <Pressable onPress={() => setTries((t) => t + 1)} accessibilityRole="button" style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: space.sm, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: colors.accent }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.card }}>{w('m_retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {day ? (
        <Pressable onPress={() => { go('market.day', { id: day.id }); }} accessibilityRole="button" style={{ borderRadius: radius.card, overflow: 'hidden', marginBottom: space.xl }}>
          <ImageBackground source={EVENT_PHOTO[day.kind] ?? EVENT_PHOTO.market_day} accessibilityIgnoresInvertColors resizeMode="cover" style={{ minHeight: 190, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: 'rgba(200,86,42,0.88)', padding: space.lg }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#FBE3D6', letterSpacing: 0.4 }}>{daysText.toUpperCase()}{day.going_count ? ` · ${w('m_going', { n: day.going_count })}` : ''}</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.card, marginTop: 4 }}>{day.title}</Text>
              <Text style={{ fontSize: 16, color: '#FBE3D6', marginTop: 4 }}>{when(day.starts_at)} · {day.venue_name}</Text>
            </View>
          </ImageBackground>
        </Pressable>
      ) : events !== undefined && !near.length && !failed ? (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, marginBottom: space.xl }}>
          <Text style={[type.body, { color: colors.muted }]}>{w('m_none')}</Text>
        </View>
      ) : null}

      {near.length ? (
        <>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.navy, marginBottom: space.sm }}>{w('m_near')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.lg }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.sm }}>
            {near.map((e) => {
              const k = KIND[e.kind] ?? KIND.activity;
              return (
                <Pressable key={e.id} onPress={() => { go('market.day', { id: e.id }); }} accessibilityRole="button" style={{ width: 224, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
                  <View style={{ height: 110, backgroundColor: k.tint }}>
                    <Image source={EVENT_PHOTO[e.kind] ?? EVENT_PHOTO.activity} accessibilityIgnoresInvertColors resizeMode="cover" style={{ width: '100%', height: 110 }} />
                    <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: k.ink }}>{w(k.word)}</Text>
                    </View>
                  </View>
                  <View style={{ padding: space.md }}>
                    <Text numberOfLines={2} style={{ fontSize: 17, fontWeight: '800', color: colors.navy, minHeight: 44 }}>{e.title}</Text>
                    <Text numberOfLines={1} style={[type.small, { color: colors.muted, marginTop: 2 }]}>{e.venue_name}</Text>
                    <Text numberOfLines={1} style={[type.small, { color: colors.muted }]}>{when(e.starts_at)}</Text>
                    <View style={{ marginTop: space.sm, minHeight: 40, borderRadius: radius.button, backgroundColor: k.tint, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: k.ink }}>{w('m_see')}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      <Pressable onPress={() => { go('wisdom.serviceOffer'); }} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: '#FBEBDD', borderRadius: radius.card, padding: space.md, marginTop: space.lg }}>
        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="storefront-outline" size={26} color={ORANGE} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.navy }}>{w('m_list')}</Text>
          <Text style={[type.small, { color: colors.muted }]}>{w('m_list_sub')}</Text>
        </View>
        <Ionicons name="add-circle" size={32} color={ORANGE} />
      </Pressable>

      <Pressable onPress={() => { go('market.more'); }} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: space.md }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>{w('m_more')}</Text>
      </Pressable>
    </Screen>
  );
}
