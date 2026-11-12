import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { commentOnUpdate, getUpdate, likeUpdate } from '../../../api/communities';
import { El, useAction, useField, usePageData, usePageWords } from '../../../kit';
import { colors, radius, space, type } from '../../../theme/tokens';
import { communityUpdate as page } from '../pages';
import { Gate, useLoad, useWhen } from '../ui';

// One community update (sample 10, screen 2): the post, likes, and the comments with a box to write one.
export default function Update() {
  const { uid } = useLocalSearchParams<{ id: string; uid: string }>();
  const w = usePageWords(page);
  const when = useWhen();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState(false);
  const { data, setData, failed, reload } = useLoad(() => getUpdate(String(uid)), String(uid));

  const like = async () => {
    if (!data) return;
    const was = data.i_like;
    setData({ ...data, i_like: !was, likes: data.likes + (was ? -1 : 1) });
    try {
      await likeUpdate(data.id, !was);
    } catch {
      setData(data);
    }
  };
  const send = async () => {
    const body = text.trim();
    if (!data || !body || busy) return;
    setBusy(true);
    setBad(false);
    try {
      setData(await commentOnUpdate(data.id, body));
      setText('');
    } catch {
      setBad(true);
    } finally {
      setBusy(false);
    }
  };
  useField(page, 'addComment', text, (v) => setText(String(v)));
  useAction(page, 'send', () => void send());
  useAction(page, 'like', () => void like());
  usePageData(
    page,
    data
      ? {
          values: [{ label: data.title, value: data.body }],
          images: [],
          lists: [{ label: w('commentsN', { n: data.comments.length }), items: data.comments.map((c) => ({ label: c.name, detail: c.body })) }],
          actions: [],
        }
      : null
  );

  return (
    <Gate title={w('update')} data={data} failed={failed} reload={reload} notFound={w('notFound')} tryAgain={w('tryAgain')}>
      {(d) => (
        <>
          <Text style={[type.small, { color: colors.muted }]}>{[d.author, when(d.created_at)].filter(Boolean).join(' · ')}</Text>
          <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '800', color: colors.ink, marginVertical: space.sm }}>{d.title}</Text>
          <Text style={[type.body, { color: colors.ink }]}>{d.body}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, marginVertical: space.md }}>
            <El page={page} id="like">
              <Pressable onPress={() => void like()} accessibilityRole="button" accessibilityLabel={d.i_like ? w('unlike') : w('like')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
                <Ionicons name={d.i_like ? 'thumbs-up' : 'thumbs-up-outline'} size={24} color={colors.accent} />
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{d.likes}</Text>
              </Pressable>
            </El>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="chatbubble-outline" size={22} color={colors.accent} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{d.comments.length}</Text>
            </View>
          </View>
          <Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>{w('commentsN', { n: d.comments.length })}</Text>
          {d.comments.length ? (
            d.comments.map((c) => (
              <View key={c.id} style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.sm }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{c.name} <Text style={[type.small, { color: colors.muted, fontWeight: '400' }]}>{when(c.created_at)}</Text></Text>
                <Text style={[type.body, { color: colors.ink, marginTop: 2 }]}>{c.body}</Text>
              </View>
            ))
          ) : (
            <Text style={[type.body, { color: colors.muted, marginBottom: space.sm }]}>{w('noComments')}</Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm }}>
            <El page={page} id="addComment">
              <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.pill, borderWidth: 1, borderColor: bad ? colors.danger : colors.line, paddingHorizontal: space.md, minHeight: 52, justifyContent: 'center' }}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={w('addComment')}
                  placeholderTextColor={colors.muted}
                  accessibilityLabel={w('addComment')}
                  maxLength={500}
                  style={[{ fontSize: 17, color: colors.ink, paddingVertical: 10 }, { outlineStyle: 'none' } as object]}
                />
              </View>
            </El>
            <El page={page} id="send">
              <Pressable onPress={() => void send()} disabled={!text.trim() || busy} accessibilityRole="button" accessibilityLabel={w('send')} style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', opacity: !text.trim() || busy ? 0.5 : 1 }}>
                <Ionicons name="send" size={22} color="#FFFFFF" />
              </Pressable>
            </El>
          </View>
          {bad ? <Text style={[type.small, { color: colors.danger, marginTop: space.xs }]}>{w('failed')}</Text> : null}
        </>
      )}
    </Gate>
  );
}
