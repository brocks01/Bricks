import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';
import type { MyCommunity, Upcoming } from '../../api/communities';
import type { Stall } from '../../api/market';
import { colors } from '../../theme/tokens';

type T = (key: string, vars?: Record<string, string | number>) => string;
const TINTS = ['#E3F1E7', '#E8E6F8', '#E6F4E1', '#FBEFD9'];
const symbol = (name: string) => (name in (Ionicons.glyphMap as Record<string, unknown>) ? (name as keyof typeof Ionicons.glyphMap) : 'people');
const card = { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 16, gap: 12 } as const;

function Line({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icon} size={18} color="#5A6472" />
      <Text style={{ flex: 1, fontSize: 16, color: '#2B3440' }}>{text}</Text>
    </View>
  );
}

function OutlineButton({ label, icon, onPress, navy }: { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; navy?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: navy ? colors.navy : '#CFC6B6', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {icon ? <Ionicons name={icon} size={18} color={navy ? colors.navy : colors.ink} /> : null}
      <Text style={{ fontSize: 16, fontWeight: '600', color: navy ? '#15202E' : colors.ink }}>{label}</Text>
    </Pressable>
  );
}

/** The next market in the person's communities: when and where, who has a stall, and the way to reserve one. Only shown when there is one. */
export function MarketDayCard({ act, stalls, lang, t, onReserve }: { act: Upcoming; stalls: Stall[]; lang: string; t: T; onReserve: () => void }) {
  const start = new Date(act.starts_at);
  const days = Math.round((new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()) / 86_400_000);
  const when = days <= 0 ? t('cday.today') : days === 1 ? t('cday.tomorrow') : t('cday.in_days', { n: days });
  return (
    <View accessibilityLabel={t('cday.market_day')} style={card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="storefront-outline" size={24} color="#92400E" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink }}>{t('cday.market_day')}</Text>
          <Text style={{ fontSize: 15, color: '#4A5361' }}>{when} · {act.community_name}</Text>
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Line icon="calendar-outline" text={start.toLocaleString(lang, { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })} />
        {act.location ? <Line icon="location-outline" text={act.location} /> : null}
        {stalls.length ? <Line icon="leaf-outline" text={t('cday.stalls', { list: stalls.map((s) => `${s.selling} (${t(`lead.slot_${s.slot}`)})`).join(', ') })} /> : null}
      </View>
      <View style={{ borderTopWidth: 1, borderColor: '#EDE6DA', paddingTop: 12 }}>
        <OutlineButton label={t('cday.reserve')} onPress={onReserve} navy />
      </View>
    </View>
  );
}

/** One community the person belongs to: its picture, its next gathering and how many are going, and a way in. */
export function CommunityCard({ c, next, i, lang, t, onOpen }: { c: MyCommunity; next: Upcoming | undefined; i: number; lang: string; t: T; onOpen: () => void }) {
  const when = next ? new Date(next.starts_at).toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : t('cday.none_planned');
  return (
    <View style={card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {c.cover_url ? (
          <Image source={{ uri: c.cover_url }} accessibilityIgnoresInvertColors style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: TINTS[i % TINTS.length] }} />
        ) : (
          <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: TINTS[i % TINTS.length], alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={symbol(c.icon)} size={28} color={colors.accent} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, lineHeight: 23, fontWeight: '600', color: colors.ink }}>{c.name}</Text>
          <Text style={{ fontSize: 15, color: '#4A5361' }}>{when}</Text>
        </View>
      </View>
      {next ? <Line icon="flag-outline" text={next.going_count > 0 ? `${next.title} · ${t('home.index.going_n', { n: next.going_count })}` : next.title} /> : null}
      <Line icon="people-outline" text={t('common.members', { n: c.member_count })} />
      <OutlineButton label={t('home.index.go')} onPress={onOpen} />
    </View>
  );
}

/** A row of the bottom list: a title, a chevron, and (except the last) a hairline under it. */
export function ListEntry({ title, onPress, line }: { title: string; onPress: () => void; line?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: line ? 1 : 0, borderColor: '#EDE6DA' }}>
      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.ink, flex: 1 }}>{title}</Text>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </Pressable>
  );
}
