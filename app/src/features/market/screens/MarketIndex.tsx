import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { CATEGORIES, getListings, type Listing } from '../../../api/market';
import { ChipRow, Empty, ListRow, Pill } from '../../../components/blocks';
import { Button, Screen } from '../../../components/ui';
import { useStore } from '../../../core/store';
import { El, useAction, useField, usePageData, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { sessionStore } from '../../../session/store';
import { colors, radius, size, space, type } from '../../../theme/tokens';
import { MarketDays } from '../MarketDays';
import { marketIndex as page } from '../pages';
import { CATEGORY_ICON, categoryWord, money, tierWord } from '../ui';

export default function MarketIndex() {
  const w = usePageWords(page);
  const navigate = useNavigate();
  const { status } = useStore(sessionStore);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [items, setItems] = useState<Listing[] | null>(null);

  const load = useCallback(() => {
    getListings(q, category === 'all' ? undefined : category).then(setItems).catch(() => setItems([]));
  }, [q, category]);
  useFocusEffect(
    useCallback(() => {
      if (status === 'in') load();
    }, [status, load])
  );

  useField(page, 'search', q, (v) => setQ(String(v)));
  useField(page, 'category', category, (v) => setCategory(String(v)));
  useAction(page, 'offer', () => navigate('market.offer'));
  useAction(page, 'mine', () => navigate('market.mine'));

  usePageData(
    page,
    items === null
      ? null
      : {
          values: [{ label: w('search'), value: q }],
          images: [],
          lists: [
            {
              label: w('h_market'),
              items: items.map((l, i) => ({
                label: l.title,
                detail: `${l.owner_name} · ${l.rate_per_hour ? w('per_hour', { price: money(l.rate_per_hour, l.currency) }) : w('free')} · ${w('years_exp', { n: l.experience_years })}`,
                actions: [{ id: `service${i + 1}`, label: l.title, run: () => { navigate('market.listing', { id: l.id }); } }],
              })),
            },
          ],
          actions: [],
        }
  );

  return (
    <Screen title={w('heading')} subtitle={w('intro')}>
      <MarketDays />
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.button, paddingHorizontal: space.md, marginBottom: space.md }}>
        <Ionicons name="search-outline" size={size.icon.md} color={colors.muted} style={{ marginRight: space.sm }} />
        <El page={page} id="search">
          <View style={{ flex: 1 }}>
            <TextInput value={q} onChangeText={setQ} placeholder={w('search')} placeholderTextColor={colors.muted} accessibilityLabel={w('search')} style={[{ minHeight: size.touch + space.sm, fontSize: 17, color: colors.ink }, { outlineStyle: 'none' } as object]} />
          </View>
        </El>
      </View>
      <El page={page} id="category">
        <ChipRow options={['all', ...CATEGORIES].map((c) => ({ value: c, label: c === 'all' ? w('all') : w(categoryWord(c as never)) }))} value={category} onChange={setCategory} />
      </El>

      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.md }}>
        <View style={{ flex: 1 }}>
          <El page={page} id="offer">
            <Button label={w('offer_service')} icon="add" onPress={() => navigate('market.offer')} />
          </El>
        </View>
        <View style={{ flex: 1 }}>
          <El page={page} id="mine">
            <Button label={w('my_market')} kind="plain" onPress={() => navigate('market.mine')} />
          </El>
        </View>
      </View>

      {items && items.length === 0 ? <Empty text={w('no_listings')} /> : null}
      {(items ?? []).map((l, i) => (
        <ListRow
          key={l.id}
          icon={CATEGORY_ICON[l.category]}
          i={i}
          title={l.title}
          sub={`${w('by_owner', { name: l.owner_name || '—' })} · ${w('years_exp', { n: l.experience_years })}`}
          onPress={() => navigate('market.listing', { id: l.id })}
          right={
            <View style={{ alignItems: 'flex-end', gap: space.xs }}>
              <Text style={[type.small, { color: colors.ink, fontWeight: '800' }]}>{l.rate_per_hour ? money(l.rate_per_hour, l.currency) : w('free')}</Text>
              <Pill text={w(tierWord(l.tier))} tone="quiet" />
              {l.verified ? <Pill text={w('verified')} /> : l.endorsements ? <Pill text={w('endorsed_n', { n: l.endorsements })} /> : null}
            </View>
          }
        />
      ))}
    </Screen>
  );
}
