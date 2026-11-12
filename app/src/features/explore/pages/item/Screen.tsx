import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { getExploreItem, saveExploreItem, setExploreProgress, type ExploreItemDetail } from '../../../../api/explore';
import { SkeletonPage } from '../../../../components/Skeleton';
import { Button, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { El, usePageData, usePageWords } from '../../../../kit';
import { sessionStore } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { FORMAT_ICON } from '../../ui';
import { exploreItem as page } from './page';

// Content detail and interactive practice in ONE adaptive screen (samples 4 and 5): a picture, time and level, what you will learn, then a step-by-step
// walk-through. Moving through the steps is saved as progress; the last step finishes the item. A practice uses demo values only.
export default function ExploreItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = usePageWords(page);
  const { status } = useStore(sessionStore);
  const [item, setItem] = useState<ExploreItemDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState(0); // 0 = not started, 1..n = on that step, n+1 = finished

  const load = useCallback(() => {
    getExploreItem(String(id))
      .then((d) => {
        setFailed(false);
        setItem(d);
        const n = Math.max(1, d.steps.length);
        setStep(d.completed ? n + 1 : d.percent > 0 ? Math.min(n, Math.round((d.percent / 100) * n) + 1) : 0);
      })
      .catch(() => setFailed(true));
  }, [id]);
  useEffect(() => {
    if (status === 'in' && id) load();
  }, [status, id, load]);

  const total = item ? Math.max(1, item.steps.length) : 1;
  const finished = !!item && step > total;
  const go = useCallback(
    async (to: number) => {
      if (!item) return;
      setStep(to);
      const percent = to > total ? 100 : Math.max(1, Math.round(((to - 1) / total) * 100));
      try {
        await setExploreProgress(item.id, percent);
      } catch {
        /* progress is a convenience; the screen keeps working */
      }
    },
    [item, total]
  );
  const toggleSave = useCallback(async () => {
    if (!item) return;
    const next = !item.saved;
    setItem({ ...item, saved: next });
    try {
      await saveExploreItem(item.id, next);
    } catch {
      setItem((x) => (x ? { ...x, saved: !next } : x));
    }
  }, [item]);

  const primary = step === 0 ? () => void go(1) : step <= total ? () => void go(step + 1) : undefined;
  const primaryId = step === 0 ? 'start' : 'next';
  const primaryLabel = step === 0 ? (item && item.percent > 0 ? w('continueBtn') : w('startLearning')) : step === total ? w('finish') : w('nextStep');

  usePageData(
    page,
    item === null
      ? null
      : {
          values: [
            { label: w('heading'), value: item.title },
            { label: w(item.format), value: `${w('min', { n: item.minutes })} · ${w(item.level)}` },
            ...(step >= 1 && step <= total ? [{ label: w('step', { n: step, total }), value: item.steps[step - 1] ?? '' }] : []),
          ],
          images: item.image_url ? [{ uri: item.image_url, alt: item.title }] : [],
          lists: [{ label: w('learn'), items: item.steps.map((s) => ({ label: s })) }],
          actions: [
            ...(primary ? [{ id: primaryId, label: primaryLabel, run: primary }] : []),
            { id: 'save', label: item.saved ? w('unsave') : w('save'), run: () => toggleSave() },
          ],
        }
  );

  if (failed) {
    return (
      <Screen title={w('heading')} back>
        <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('notFound')}</Text>
        <Button label={w('tryAgain')} onPress={load} />
      </Screen>
    );
  }
  if (!item) {
    return (
      <Screen title={w('heading')} back>
        <SkeletonPage banner cards={2} />
      </Screen>
    );
  }

  return (
    <Screen title={item.title} back>
      <El page={page} id="heading">
        <View style={{ height: 180, borderRadius: radius.card, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentLine, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: space.md }}>
          {item.image_url ? <Image source={{ uri: item.image_url }} accessibilityIgnoresInvertColors style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" /> : <Ionicons name={FORMAT_ICON[item.format]} size={64} color={colors.accent} />}
        </View>
      </El>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md }}>
        {[w('min', { n: item.minutes }), w(item.format), w(item.level)].map((t) => (
          <Text key={t} style={{ fontSize: 14, fontWeight: '600', color: colors.accent, backgroundColor: colors.accentSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.button, overflow: 'hidden' }}>{t}</Text>
        ))}
      </View>
      <Text style={[type.body, { color: colors.ink }]}>{item.summary}</Text>
      {item.category_id === 'health_awareness' ? <Text style={[type.small, { color: colors.warn, backgroundColor: colors.warnSoft, padding: space.sm, borderRadius: 10, marginTop: space.md }]}>{w('notAdvice')}</Text> : null}
      {item.format === 'interactive' ? <Text style={[type.small, { color: colors.muted, marginTop: space.md }]}>{w('practiceNote')}</Text> : null}

      {step === 0 || finished ? (
        <>
          <Text style={[type.h2, { color: colors.ink, marginTop: space.lg, marginBottom: space.sm }]}>{w('learn')}</Text>
          {item.steps.map((s, n) => (
            <View key={n} style={{ flexDirection: 'row', gap: space.sm, marginBottom: 6 }}>
              <Ionicons name={finished ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={colors.accent} />
              <Text style={[type.body, { color: colors.ink, flex: 1 }]}>{s}</Text>
            </View>
          ))}
        </>
      ) : (
        <View style={{ marginTop: space.lg, padding: space.lg, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.accentLine }}>
          <Text style={[type.small, { color: colors.accent, fontWeight: '700' }]}>{w('step', { n: step, total })}</Text>
          <Text style={[type.h2, { color: colors.ink, marginTop: space.xs }]}>{item.steps[step - 1]}</Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.accentSoft, marginTop: space.md }}>
            <View style={{ width: `${Math.round((step / total) * 100)}%`, height: 6, borderRadius: 3, backgroundColor: colors.accent }} />
          </View>
        </View>
      )}

      {item.body && (finished || step === 0) ? <Text style={[type.body, { color: finished ? colors.ink : colors.muted, marginTop: space.lg }]}>{item.body}</Text> : null}

      <View style={{ marginTop: space.lg, gap: space.sm }}>
        {primary ? (
          <El page={page} id={primaryId}>
            <Button label={primaryLabel} onPress={primary} icon={step === 0 ? 'play' : step === total ? 'checkmark' : 'arrow-forward'} />
          </El>
        ) : (
          <Text style={[type.h2, { color: colors.accent, textAlign: 'center' }]}>{w('done')}</Text>
        )}
        <El page={page} id="save">
          <Pressable onPress={() => void toggleSave()} accessibilityRole="button" style={{ minHeight: 48, borderRadius: radius.button, borderWidth: 1, borderColor: colors.accentLine, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <Ionicons name={item.saved ? 'bookmark' : 'bookmark-outline'} size={22} color={colors.accent} />
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.accent }}>{item.saved ? w('saved') : w('save')}</Text>
          </Pressable>
        </El>
      </View>
      <Text style={[type.small, { color: colors.muted, marginTop: space.lg }]}>{w('source')}: {item.source}. {w('draftNote')}</Text>
    </Screen>
  );
}
