import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { exploreCommunities, joinOpenCommunity, type ExploreCommunity } from '../../../../api/communityRules';
import { SkeletonList } from '../../../../components/Skeleton';
import { Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useT } from '../../../../i18n';
import { El, useAction, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore } from '../../../../session/store';
import { colors, space } from '../../../../theme/tokens';
import '../../../lead/leadWords'; // registers the words
import { connectPick as page } from '../../pages';

// First run, like the owner's design: "What would you like to do?" Up to three places, each a card with a picture; a tick shows the choice; Continue joins them.
export default function Pick() {
  const w = usePageWords(page);
  const t = useT();
  const go = useNavigate();
  const { status } = useStore(sessionStore);
  const [list, setList] = useState<ExploreCommunity[] | null>(null);
  const [room, setRoom] = useState(3);
  const [chosen, setChosen] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (status !== 'in') return;
    exploreCommunities('')
      .then((r) => {
        setRoom(r.limits.left);
        setList(r.communities.filter((c) => c.privacy === 'open' && !c.joined));
      })
      .catch(() => setList([]));
  }, [status]);

  const toggle = (id: string) => {
    setNote(null);
    setChosen((c) => {
      if (c.includes(id)) return c.filter((x) => x !== id);
      if (c.length >= room) {
        setNote(t('lead.pick_full'));
        return c;
      }
      return [...c, id];
    });
  };
  const next = async () => {
    if (!chosen.length) return setNote(t('lead.pick_none'));
    if (busy) return;
    setBusy(true);
    try {
      for (const id of chosen) await joinOpenCommunity(id);
      go('connect.index', undefined, { replace: true });
    } catch {
      setNote(t('lead.failed'));
      setBusy(false);
    }
  };
  useAction(page, 'pickContinue', next);

  return (
    <Screen title={w('heading')} subtitle={t('lead.pick_sub')} plain={false}>
      {list === null ? <SkeletonList count={3} /> : null}
      <View style={{ gap: 12 }}>
        {(list ?? []).map((c) => {
          const on = chosen.includes(c.id);
          return (
            <Pressable key={c.id} onPress={() => toggle(c.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={c.name}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 14, backgroundColor: colors.card, borderWidth: on ? 2 : 1, borderColor: on ? colors.navy : colors.line }}>
              {c.cover_url ? (
                <Image source={{ uri: c.cover_url }} accessibilityIgnoresInvertColors style={{ width: 76, height: 76, borderRadius: 10, backgroundColor: colors.accentSoft }} />
              ) : (
                <View style={{ width: 76, height: 76, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="people" size={32} color={colors.accent} /></View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink }}>{c.name}</Text>
                <Text style={{ fontSize: 16, color: '#4A5361' }} numberOfLines={2}>{[c.area_name, t('common.members', { n: c.member_count })].filter(Boolean).join(' · ')}</Text>
              </View>
              <View style={{ width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.navy : '#FFFFFF', borderWidth: on ? 0 : 1, borderColor: '#CFC6B6' }}>
                {on ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ backgroundColor: colors.bg, borderRadius: 12, padding: 14, marginTop: space.lg }}>
        <Text style={{ fontSize: 16, color: '#4A5361' }}>{t('lead.pick_note')}</Text>
      </View>
      {note ? <Text style={{ fontSize: 15, color: colors.danger, fontWeight: '600', marginTop: space.sm }}>{note}</Text> : null}
      <El page={page} id="pickContinue">
        <Pressable onPress={() => void next()} accessibilityRole="button" style={{ minHeight: 56, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: space.lg }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#FFFFFF' }}>{t('lead.pick_go')}</Text>
        </Pressable>
      </El>
    </Screen>
  );
}
