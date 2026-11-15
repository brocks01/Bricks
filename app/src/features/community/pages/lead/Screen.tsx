import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ApiError } from '../../../../api/client';
import { checkIn, getLeadView, type LeadView } from '../../../../api/lead';
import { SkeletonPage } from '../../../../components/Skeleton';
import { Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { useLanguage, useT } from '../../../../i18n';
import { usePageData, usePageWords } from '../../../../kit';
import { sessionStore } from '../../../../session/store';
import { colors, space } from '../../../../theme/tokens';
import { Btn, box, LINE, RotaCard, VoteCard } from '../../../lead/LeadBits';
import '../../../lead/leadWords'; // registers the words of the leader tools
import { communityLead as page } from '../../pages';

// The Community Lead's page, like the owner's design: the signature product and its vote, today's check-ins ("check in for them"), and the rota with its gaps.
export default function Lead() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = usePageWords(page);
  const t = useT();
  const lang = useLanguage();
  const { status } = useStore(sessionStore);
  const [data, setData] = useState<LeadView | null>(null);
  const [refused, setRefused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    getLeadView(String(id))
      .then((x) => {
        setData(x);
        setRefused(false);
      })
      .catch((e) => setRefused(e instanceof ApiError && e.code === 'not_a_lead'));
  }, [id]);
  useEffect(() => {
    if (status === 'in' && id) load();
  }, [status, id, load]);
  usePageData(page, data === null ? null : { values: [{ label: t('lead.product_title'), value: data.product ?? t('lead.product_none') }], images: [], lists: [], actions: [] });

  if (refused) {
    return (
      <Screen title={w('heading')} back>
        <Text style={{ fontSize: 16, color: colors.muted }}>{t('lead.not_a_lead')}</Text>
      </Screen>
    );
  }
  if (!data) {
    return (
      <Screen title={w('heading')} back>
        <SkeletonPage cards={3} />
      </Screen>
    );
  }
  const time = (iso: string) => new Date(iso).toLocaleString(lang, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  const forThem = async (activityId: string, userId: string) => {
    setError(null);
    try {
      await checkIn(activityId, userId);
    } catch {
      setError(t('lead.failed'));
    }
    load();
  };
  return (
    <Screen title={w('heading')} subtitle={t('lead.lead_only', { name: data.community.name })} back>
      {error ? <Text style={{ fontSize: 14, color: colors.danger, fontWeight: '600', marginBottom: space.sm }}>{error}</Text> : null}
      <View style={{ gap: space.lg }}>
        <View style={[box, { paddingVertical: 16, gap: 8 }]}>
          <Text style={{ fontSize: 15, fontWeight: '500', color: '#4A5361' }}>{t('lead.product_title')}</Text>
          <Text style={{ fontSize: 24, fontWeight: '600', color: colors.ink }}>{data.product ?? t('lead.product_none')}</Text>
          {data.since ? <Text style={{ fontSize: 14, color: '#4A5361' }}>{t('lead.since', { date: new Date(data.since).toLocaleDateString(lang, { month: 'long', year: 'numeric' }) })}</Text> : null}
        </View>

        <VoteCard cid={data.community.id} lead t={t} onChanged={load} />

        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 19, fontWeight: '600', color: colors.ink }} accessibilityRole="header">{t('lead.checkins_title')}</Text>
          {data.gatherings.length === 0 ? <Text style={{ fontSize: 16, color: '#4A5361' }}>{t('lead.nobody')}</Text> : null}
          {data.gatherings.map((g) => (
            <View key={g.id} style={{ gap: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.ink }}>{g.title} · {time(g.starts_at)}</Text>
              <View style={box}>
                {g.people.map((p, i) => (
                  <View key={p.user_id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 12, borderBottomWidth: i < g.people.length - 1 ? 1 : 0, borderColor: LINE }}>
                    <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: colors.ink }}>{p.name}</Text>
                    {p.checked_in ? (
                      <View style={{ backgroundColor: '#E3F1E7', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 }}><Text style={{ fontSize: 13, fontWeight: '600', color: '#245A40' }}>{t('lead.here_tag')}</Text></View>
                    ) : (
                      <Btn small kind="plain" label={t('lead.check_in')} onPress={() => void forThem(g.id, p.user_id)} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <RotaCard cid={data.community.id} lead t={t} lang={lang} />
      </View>
    </Screen>
  );
}
