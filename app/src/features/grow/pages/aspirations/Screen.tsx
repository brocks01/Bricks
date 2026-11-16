import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { addAspiration, getAspirations, removeAspiration, setAspirationDone, type Aspiration, type AspirationKind } from '../../../../api/grow';
import { Hero } from '../../../../components/Hero';
import { SkeletonList } from '../../../../components/Skeleton';
import { Button, Field } from '../../../../components/ui';
import { BackScreen } from '../../../../components/BackButton';
import { useStore } from '../../../../core/store';
import { El, useField, usePageData, usePageWords } from '../../../../kit';
import { sessionStore } from '../../../../session/store';
import { colors, space, type } from '../../../../theme/tokens';
import { Card, Chips, RemoveButton } from '../../ui';
import { growAspirations as page } from './page';

const KINDS: AspirationKind[] = ['travel', 'hobby', 'health', 'family', 'own'];
const ICON: Record<AspirationKind, keyof typeof Ionicons.glyphMap> = { travel: 'earth-outline', hobby: 'color-palette-outline', health: 'heart-outline', family: 'people-outline', own: 'star-outline' };

// Aspirations (sample 11, screen 6): a banner, the person's own list, and Add an Aspiration. Nothing is pre-filled: the list is whatever the person wrote.
export default function Aspirations() {
  const w = usePageWords(page);
  const { status } = useStore(sessionStore);
  const [list, setList] = useState<Aspiration[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<AspirationKind>('own');
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    getAspirations()
      .then((x) => {
        setFailed(false);
        setList(x);
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    if (status === 'in') load();
  }, [status, load]);

  const save = useCallback(async () => {
    if (title.trim().length < 2) return;
    setError(false);
    try {
      const a = await addAspiration(title.trim(), kind);
      setList((l) => [a, ...(l ?? [])]);
      setTitle('');
      setAdding(false);
    } catch {
      setError(true);
    }
  }, [title, kind]);
  const toggle = useCallback(async (a: Aspiration) => {
    const set = (done: boolean) => setList((l) => (l ? l.map((x) => (x.id === a.id ? { ...x, done } : x)) : l));
    set(!a.done);
    try {
      await setAspirationDone(a.id, !a.done);
    } catch {
      set(a.done);
    }
  }, []);

  const remove = useCallback(async (a: Aspiration) => {
    setList((l) => (l ? l.filter((x) => x.id !== a.id) : l)); // gone at once, put back if the server refuses
    try {
      await removeAspiration(a.id);
    } catch {
      setList((l) => (l ? [a, ...l] : l));
    }
  }, []);

  useField(page, 'addTitle', title, (v) => setTitle(String(v)));
  useField(page, 'kindOf', kind, (v) => setKind(KINDS.includes(v as AspirationKind) ? (v as AspirationKind) : 'own'));

  usePageData(
    page,
    list === null
      ? null
      : {
          values: adding ? [{ label: w('addTitle'), value: title }] : [],
          images: [],
          lists: [{ label: w('heading'), items: list.map((a, n) => ({ label: a.title, detail: `${w('cat_' + a.category)}${a.done ? ' · ' + w('done') : ''}`, actions: [{ id: `toggle${n + 1}`, label: a.done ? a.title : `${w('markDone')}: ${a.title}`, run: () => toggle(a) }, { id: `remove${n + 1}`, label: `${w('remove')}: ${a.title}`, run: () => remove(a) }] })) }],
          actions: [{ id: 'add', label: w('add'), run: () => setAdding(true) }, ...(adding ? [{ id: 'saveAsp', label: w('save'), run: () => save() }] : [])],
        }
  );

  return (
    <BackScreen title={w('heading')}>
      <Hero source={require('../../../../../assets/images/aspirations.jpg')} title={w('heading')} subtitle={w('asp_intro')} height={150} />
      {failed ? (
        <>
          <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('notFound')}</Text>
          <Button label={w('tryAgain')} onPress={load} />
        </>
      ) : list === null ? (
        <SkeletonList count={3} />
      ) : (
        <>
          {list.length === 0 && !adding ? <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('empty')}</Text> : null}
          {list.map((a) => (
            <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
            <Card onPress={() => void toggle(a)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Ionicons name={ICON[a.category]} size={26} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16.5, fontWeight: '700', color: colors.ink, textDecorationLine: a.done ? 'line-through' : 'none' }}>{a.title}</Text>
                  <Text style={[type.small, { color: colors.muted }]}>{w('cat_' + a.category)}</Text>
                </View>
                <Ionicons name={a.done ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={colors.accent} />
              </View>
            </Card>
              </View>
              <RemoveButton label={w('remove')} onPress={() => void remove(a)} />
            </View>
          ))}
          {adding ? (
            <View style={{ marginTop: space.sm }}>
              <Field label={w('addTitle')} value={title} onChangeText={setTitle} maxLength={120} />
              <Chips options={KINDS.map((k) => ({ id: k, label: w('cat_' + k) }))} value={kind} onChange={setKind} />
              {error ? <Text style={[type.small, { color: colors.danger, marginBottom: space.sm }]}>{w('failed')}</Text> : null}
              <El page={page} id="saveAsp"><Button label={w('save')} onPress={() => void save()} icon="checkmark" disabled={title.trim().length < 2} /></El>
              <Pressable onPress={() => setAdding(false)} accessibilityRole="button" style={{ alignItems: 'center', padding: space.md }}><Text style={{ color: colors.accent, fontWeight: '700', fontSize: 16 }}>{w('cancel')}</Text></Pressable>
            </View>
          ) : (
            <El page={page} id="add"><Button label={w('add')} onPress={() => setAdding(true)} icon="add" /></El>
          )}
        </>
      )}
    </BackScreen>
  );
}
