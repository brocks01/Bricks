import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import type { CommunityCard as Card } from '../../api/communityRules';
import { useLanguage, useT } from '../../i18n';
import { colors, radius, space } from '../../theme/tokens';
import { whenWords, type Lang } from '../community/when';
import { communityPhoto } from './photos';
import './revampWords'; // registers the words

const WA_GREEN = '#1F8F4E'; // WhatsApp's green, darkened to keep white text readable (contrast above 4.5:1)

/** The reason a community was suggested, in words: near (with the distance or the area) or a shared interest. */
export function reasonWords(c: Card, t: ReturnType<typeof useT>): string | null {
  const near = c.reasons.find((r) => r.kind === 'near');
  if (near && near.kind === 'near') return near.km != null ? t('rv.near_km', { km: near.km }) : t('rv.near_area', { area: (near.area ?? '').replace(/, Singapore$/, '') });
  const like = c.reasons.find((r) => r.kind === 'interest');
  if (like && like.kind === 'interest') return t('rv.because', { what: t(`rv.i_${like.key}`) });
  return null;
}

/** Up to five small faces (initials), overlapping, for the people in a community. */
export function Faces({ names }: { names: (string | null)[] }) {
  const tints = ['#E3F1E7', '#E8E6F8', '#FBEFD9', '#E4EEF8', '#FAECE5'];
  return (
    <View style={{ flexDirection: 'row' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {names.slice(0, 5).map((n, i) => (
        <View key={i} style={{ width: 30, height: 30, borderRadius: 15, marginLeft: i ? -8 : 0, backgroundColor: tints[i % tints.length], borderWidth: 2, borderColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.navy }}>{(n ?? '?').slice(0, 1).toUpperCase()}</Text>
        </View>
      ))}
    </View>
  );
}

function BigButton({ label, icon, onPress, tone }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; tone: 'whatsapp' | 'navy' | 'outline' }) {
  const bg = tone === 'whatsapp' ? WA_GREEN : tone === 'navy' ? colors.navy : colors.card;
  const fg = tone === 'outline' ? colors.navy : '#FFFFFF';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ flex: 1, minHeight: 56, borderRadius: radius.button, backgroundColor: bg, borderWidth: 2, borderColor: tone === 'outline' ? colors.navy : bg, opacity: pressed ? 0.85 : 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: space.sm, paddingVertical: space.sm })}>
      <Ionicons name={icon} size={22} color={fg} />
      <Text style={{ flexShrink: 1, fontSize: 17, fontWeight: '700', color: fg, textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

/**
 * One community, the same everywhere (the tab, search, the first-run choice): the words on the left, its picture on the right, and two big buttons:
 * Join WhatsApp group (a member, when the leader saved a link; a leader without one sees "Add WhatsApp link"; someone not in it sees "Join") and See events.
 * Tapping the rest of the card opens the community. In `choose` mode (the first-run choice) the buttons give way to a big tick.
 */
export function CommunityCard({ c, onOpen, onEvents, onJoin, onAddWhatsapp, chosen, onChoose, dim }: {
  c: Card; onOpen: () => void; onEvents: () => void; onJoin?: () => void; onAddWhatsapp?: () => void;
  chosen?: boolean; onChoose?: () => void; dim?: boolean;
}) {
  const t = useT();
  const lang = useLanguage() as Lang;
  const [failed, setFailed] = useState(false);
  const choose = !!onChoose;
  const people = c.is_member || !c.leader ? t('rv.members', { n: c.member_count }) : t('rv.members_led', { n: c.member_count, name: c.leader });
  const next = c.next_event ? t('rv.next', { when: whenWords(c.next_event.starts_at, lang), title: c.next_event.title }) : t('rv.none_planned');
  const reason = reasonWords(c, t);
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: chosen ? 3 : 1, borderColor: chosen ? colors.navy : colors.line, padding: space.lg, gap: space.md, opacity: dim ? 0.5 : 1 }}>
      <Pressable onPress={choose ? onChoose : onOpen} accessibilityRole={choose ? 'checkbox' : 'button'} accessibilityState={choose ? { checked: !!chosen, disabled: !!dim } : undefined}
        accessibilityLabel={choose ? c.name : t('rv.open_community', { name: c.name })} style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ fontSize: 21, lineHeight: 27, fontWeight: '700', color: colors.ink }}>{c.name}</Text>
          {c.audience !== 'all' ? (
            <View style={{ alignSelf: 'flex-start', backgroundColor: colors.navySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.navy }}>{t(c.audience === 'men' ? 'rv.men_only' : 'rv.women_only')}</Text>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
            {c.faces.length ? <Faces names={c.faces.map((f) => f.name)} /> : <Ionicons name="people" size={20} color={colors.muted} />}
            <Text style={{ flexShrink: 1, fontSize: 17, color: colors.ink }}>{people}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
            <Ionicons name="calendar-outline" size={20} color={colors.muted} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: 17, lineHeight: 24, color: colors.ink }}>{next}</Text>
          </View>
          {reason ? (
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Ionicons name={c.reasons[0]?.kind === 'near' ? 'location' : 'heart'} size={16} color={colors.accentDark} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.accentDark }}>{reason}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ alignItems: 'center', gap: space.sm }}>
          <Image source={communityPhoto(c, failed)} onError={() => setFailed(true)} accessibilityIgnoresInvertColors style={{ width: 96, height: 96, borderRadius: 16, backgroundColor: colors.accentSoft }} />
          {choose ? (
            <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: chosen ? colors.navy : colors.card, borderWidth: 2, borderColor: chosen ? colors.navy : '#B9AF9F' }}>
              {chosen ? <Ionicons name="checkmark" size={28} color="#FFFFFF" /> : null}
            </View>
          ) : null}
        </View>
      </Pressable>
      {choose ? null : (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {c.is_member
            ? c.whatsapp_url
              ? <BigButton tone="whatsapp" icon="logo-whatsapp" label={t('rv.whatsapp')} onPress={() => void Linking.openURL(c.whatsapp_url as string)} />
              : onAddWhatsapp ? <BigButton tone="outline" icon="logo-whatsapp" label={t('rv.add_whatsapp')} onPress={onAddWhatsapp} /> : null
            : onJoin ? <BigButton tone="navy" icon="add-circle-outline" label={t('rv.join')} onPress={onJoin} /> : null}
          <BigButton tone="outline" icon="calendar-outline" label={t('rv.see_events')} onPress={onEvents} />
        </View>
      )}
    </View>
  );
}
