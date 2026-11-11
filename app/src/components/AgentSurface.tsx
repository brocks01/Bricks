import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { answerSurface, hideSurface, surfaceStore } from '../agent/surface';
import { useStore } from '../core/store';
import { useT } from '../i18n';
import { useCurrentPage } from '../navigation';
import { colors, radius, space, type } from '../theme/tokens';
import { HtmlFrame } from './HtmlFrame';
import { Button } from './ui';

/**
 * The agent's surface: a panel over the top of the app (the tab bar and the agent bar stay visible below it) where the agent shows a question,
 * steps, or a small page it wrote for this person, in their language. The person can always close it. Mounted once in the root layout.
 */
export function AgentSurface() {
  const t = useT();
  const { open, surface } = useStore(surfaceStore);
  const [text, setText] = useState('');
  const page = useCurrentPage();
  useEffect(() => {
    if (open) setText('');
  }, [open, surface]);
  // Moving to another screen closes it. A question asked for the old screen is answered as "closed", so the agent is never left waiting.
  useEffect(() => {
    hideSurface();
  }, [page?.key]);
  if (!open || !surface) return null;

  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(22,32,42,0.35)', padding: space.md, justifyContent: 'flex-start' }}>
      <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.accentLine, maxHeight: '100%', overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm }}>
          <Ionicons name="sparkles" size={22} color={colors.accent} />
          <Text style={[type.h2, { color: colors.ink, flex: 1 }]} accessibilityRole="header" numberOfLines={2}>{surface.title || 'Bricks Agent'}</Text>
          <Pressable onPress={hideSurface} accessibilityRole="button" accessibilityLabel={t('common.agent.close')} hitSlop={10}>
            <Ionicons name="close" size={26} color={colors.ink} />
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.md }}>
          {surface.message ? <Text style={[type.body, { color: colors.ink }]}>{surface.message}</Text> : null}
          {surface.steps.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>{i + 1}</Text>
              </View>
              <Text style={[type.body, { color: colors.ink, flex: 1 }]}>{s}</Text>
            </View>
          ))}
          {surface.html ? <HtmlFrame html={surface.html} /> : null}
          {surface.options.map((o) => (
            <Button key={o} kind="plain" label={o} onPress={() => answerSurface(o, 'option')} />
          ))}
          {surface.allowText ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TextInput value={text} onChangeText={setText} onSubmitEditing={() => text.trim() && answerSurface(text.trim(), 'typed')} placeholder={t('common.agent.type')} placeholderTextColor={colors.muted} accessibilityLabel={t('common.agent.type')} style={{ flex: 1, fontSize: 17, color: colors.ink, backgroundColor: colors.bg, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: colors.line }} />
              <Pressable onPress={() => text.trim() && answerSurface(text.trim(), 'typed')} accessibilityRole="button" accessibilityLabel="Send" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}
