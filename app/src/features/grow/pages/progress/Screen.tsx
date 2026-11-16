import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getWisdom, type WisdomEvent } from '../../../../api/nodes';
import { BackScreen } from '../../../../components/BackButton';
import { SkeletonList } from '../../../../components/Skeleton';
import { useStore } from '../../../../core/store';
import { useLanguage } from '../../../../i18n';
import { El, usePageData, usePageWords } from '../../../../kit';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space } from '../../../../theme/tokens';
import { TREE_COLOURS, WisdomTree } from '../../WisdomTreeView';
import { LEAF_LENGTH, LEAF_PATH } from '../../wisdomTree';
import { wisdomStore } from '../../wisdomStore';
import { growProgress as page } from './page';

const LOCALE: Record<string, string> = { en: 'en-SG', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-SG', zh: 'zh-SG', ms: 'ms-SG' };
const PAGE = 5; // the history shows five, then five more each time "Show more" is pressed

// The Tree of Wisdom: the person's tree (bare branches at first, one leaf for every event they showed up to), the number of leaves,
// and the history of those events. Nothing here can be edited: a leaf is earned only by showing up.
export default function TreeOfWisdom() {
  const w = usePageWords(page);
  const lang = useLanguage();
  const { status } = useStore(sessionStore);
  const [leaves, setLeaves] = useState<number | null>(null);
  const [events, setEvents] = useState<WisdomEvent[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getWisdom(PAGE)
      .then((r) => {
        setLeaves(r.leaves);
        setEvents(r.events);
        setNext(r.next_before);
        setFailed(false);
        wisdomStore.set({ leaves: r.leaves }); // the little tree in the header shows the same number
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (status === 'in') load();
  }, [status, load]);

  const more = useCallback(async () => {
    if (!next || busy) return;
    setBusy(true);
    try {
      const r = await getWisdom(PAGE, next);
      setEvents((l) => [...l, ...r.events.filter((e) => !l.some((x) => x.id === e.id))]);
      setNext(r.next_before);
      setLeaves(r.leaves);
    } catch {
      /* the button stays: pressing it again tries again */
    } finally {
      setBusy(false);
    }
  }, [next, busy]);

  const thisYear = new Date().getFullYear();
  const day = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(LOCALE[lang] ?? 'en-SG', { weekday: 'long', day: 'numeric', month: 'long', ...(d.getFullYear() === thisYear ? null : { year: 'numeric' }) });
  };
  const from = (e: WisdomEvent) =>
    e.source === 'wisdom' ? (e.source_name ? w('session_with', { name: e.source_name }) : w('session'))
    : e.source_name ? w('from_name', { name: e.source_name })
    : e.source === 'market' ? w('from_market') : w('from_community');
  const countWords = (n: number) => (n === 1 ? w('leaves_one') : w('leaves_n', { n }));

  usePageData(
    page,
    leaves === null
      ? failed ? { values: [{ label: w('heading'), value: w('failed') }], images: [], lists: [], actions: [{ id: 'retry', label: w('retry'), run: () => load() }] } : null
      : {
          values: [{ label: w('heading'), value: `${countWords(leaves)}. ${leaves ? w('every') : w('first')}` }],
          images: [],
          lists: [{ label: w('history'), items: events.map((e) => ({ label: e.title, detail: `${day(e.at)} · ${from(e)}` })) }],
          actions: next ? [{ id: 'showMore', label: w('showMore'), run: () => more() }] : [],
        }
  );

  return (
    <BackScreen title={w('heading')}>
      {leaves === null ? (
        failed ? (
          <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md }}>
            <Text style={{ fontSize: 19, lineHeight: 26, fontWeight: '600', color: colors.ink }}>{w('failed')}</Text>
            <El page={page} id="retry"><Wide label={w('retry')} onPress={load} /></El>
          </View>
        ) : (
          <SkeletonList count={4} />
        )
      ) : (
        <>
          <WisdomTree leaves={leaves} label={w('picture', { n: leaves })} />
          <El page={page} id="count">
            <View style={{ alignItems: 'center', paddingVertical: space.lg, gap: 4 }}>
              <Text accessibilityRole="header" style={{ fontSize: 36, lineHeight: 44, fontWeight: '800', color: colors.ink }}>{countWords(leaves)}</Text>
              <Text style={{ fontSize: 19, lineHeight: 27, color: colors.ink, textAlign: 'center' }}>{leaves ? w('every') : w('first')}</Text>
            </View>
          </El>

          {events.length ? (
            <View>
              <El page={page} id="history"><Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: '800', color: colors.ink, marginBottom: space.sm }}>{w('history')}</Text></El>
              <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, paddingHorizontal: space.lg }}>
                {events.map((e, i) => (
                  <View key={e.id} accessible accessibilityLabel={`${e.title}. ${day(e.at)}. ${from(e)}. ${w('one_leaf')}`} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderColor: colors.line }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 20, lineHeight: 26, fontWeight: '700', color: colors.ink }}>{e.title}</Text>
                      <Text style={{ fontSize: 18, lineHeight: 24, color: colors.ink }}>{day(e.at)}</Text>
                      <Text style={{ fontSize: 18, lineHeight: 24, fontWeight: '600', color: colors.navy }}>{from(e)}</Text>
                    </View>
                    <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}>
                      <Svg width={26} height={20} viewBox={`-1 -9 ${LEAF_LENGTH + 2} 18`}><Path d={LEAF_PATH} fill={TREE_COLOURS.greens[0]} /></Svg>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: TREE_COLOURS.greens[2] }}>+1</Text>
                    </View>
                  </View>
                ))}
              </View>
              {next ? (
                <View style={{ marginTop: space.md }}>
                  <El page={page} id="showMore"><Wide label={w('showMore')} onPress={() => void more()} disabled={busy} /></El>
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </BackScreen>
  );
}

/** A full-width button, 56 high, with a word on it. */
function Wide({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} style={({ pressed }) => ({ minHeight: 56, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg, backgroundColor: colors.accent, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 })}>
      <Text style={{ fontSize: 19, fontWeight: '800', color: colors.card }}>{label}</Text>
    </Pressable>
  );
}
