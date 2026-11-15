import { Ionicons } from '@expo/vector-icons';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import type { Upcoming } from '../../../api/communities';
import { colors } from '../../../theme/tokens';

type W = (key: string, vars?: Record<string, string | number>) => string;
export type Answer = 'yes' | 'no' | null;

/**
 * The big card for the next gathering, as in the design: a photo with a Directions chip, a small tag, the title, when / where / who is going, and the two answers
 * "I'm going" and "Not this time". After an answer the buttons give way to one line and a "Change my answer" link. Everything comes from the person's own communities.
 */
const VOICE: Record<string, string> = { en: 'en-SG', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-IN', zh: 'zh-CN', ms: 'ms-MY' };
const canSpeak = () => typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis;

export function ActivityCard({ act, answer, lang, w, readAloud, nowMs, onYes, onNo, onChange, onOpen, onHere }: {
  act: Upcoming; answer: Answer; lang: string; w: W; readAloud: boolean; nowMs: number; onYes: () => void; onNo: () => void; onChange: () => void; onOpen: () => void; onHere: () => void;
}) {
  const start = new Date(act.starts_at);
  const today = start.toDateString() === new Date().toDateString();
  const day = today ? w('today_word') : start.toLocaleDateString(lang, { weekday: 'long' });
  const when = start.toLocaleString(lang, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const who = act.going_names ?? []; // an older server may not send the names
  const others = Math.max(0, (act.going_count ?? 0) - (act.i_going ? 1 : 0));
  const names = who.join(', ');
  const crowd = others > who.length && who.length
    ? w('going_names', { names, n: others - who.length })
    : who.length ? w('going_only', { names })
    : others > 0 ? w('going_n', { n: others }) : '';
  // "I'm here" opens an hour before the start and stays open for the rest of the day (the server checks the same window).
  const msToStart = start.getTime() - nowMs; // the clock comes from the screen (it moves every half minute)
  const hereOpen = msToStart <= 3_600_000 && msToStart >= -12 * 3_600_000;
  const maps = act.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${act.location} Singapore`)}` : '';
  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance([act.title, when, act.location ?? '', crowd].filter(Boolean).join('. '));
      u.lang = VOICE[lang] ?? 'en-SG';
      u.rate = 0.9;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {
      /* a device that cannot speak just stays quiet */
    }
  };
  const row = (icon: keyof typeof Ionicons.glyphMap, text: string) => (
    <View key={icon} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icon} size={18} color="#5A6472" />
      <Text style={{ flex: 1, fontSize: 16, color: '#2B3440' }}>{text}</Text>
    </View>
  );
  return (
    <View accessibilityLabel={act.title} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, gap: 14 }}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={act.community_name} style={{ height: 176, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
        {act.image_url ? <Image source={{ uri: act.image_url }} accessibilityIgnoresInvertColors resizeMode="cover" style={{ position: 'absolute', width: '100%', height: '100%' }} /> : <Ionicons name="people" size={56} color={colors.accent} />}
        {maps ? (
          <Pressable onPress={() => void Linking.openURL(maps)} accessibilityRole="link" accessibilityLabel={w('directions')} style={{ position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 }}>
            <Ionicons name="location-outline" size={15} color={colors.ink} />
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.ink }}>{w('directions')}</Text>
          </Pressable>
        ) : null}
      </Pressable>
      <View style={{ paddingHorizontal: 4, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flexShrink: 1, backgroundColor: '#F6E7DF', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#8A3D1F' }}>{day} · {act.community_name}</Text>
          </View>
          {readAloud && canSpeak() ? (
            <Pressable onPress={speak} accessibilityRole="button" accessibilityLabel={w('read_aloud')} style={{ width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="volume-high-outline" size={19} color={colors.ink} />
            </Pressable>
          ) : null}
        </View>
        <Text style={{ fontSize: 23, lineHeight: 28, fontWeight: '600', color: colors.ink, letterSpacing: -0.2 }} accessibilityRole="header">{act.title}</Text>
        <View style={{ gap: 9 }}>
          {row('time-outline', when)}
          {act.location ? row('location-outline', act.location) : null}
          {crowd ? row('people-outline', crowd) : null}
        </View>
        {answer === null ? (
          <View style={{ gap: 8, paddingTop: 4 }}>
            <Pressable onPress={onYes} accessibilityRole="button" style={{ minHeight: 54, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#FFFFFF' }}>{w('going_btn')}</Text>
            </Pressable>
            <Pressable onPress={onNo} accessibilityRole="button" style={{ minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: '#CFC6B6', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '500', color: colors.ink }}>{w('not_now')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 6, paddingTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: answer === 'yes' ? colors.navySoft : colors.bg, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 }}>
              {answer === 'yes' ? <Ionicons name="checkmark" size={20} color={colors.navy} /> : null}
              <Text style={{ flex: 1, fontSize: 16, fontWeight: answer === 'yes' ? '600' : '400', color: answer === 'yes' ? '#15202E' : '#2B3440' }}>{answer === 'yes' ? w('you_going') : w('no_problem')}</Text>
            </View>
            {answer === 'yes' && act.i_attended ? (
              <View style={{ backgroundColor: '#E3F1E7', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#245A40' }}>{w('here_done')}</Text>
              </View>
            ) : answer === 'yes' && hereOpen ? (
              <Pressable onPress={onHere} accessibilityRole="button" style={{ minHeight: 54, borderRadius: 12, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Ionicons name="location" size={19} color="#FFFFFF" />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#FFFFFF' }}>{w('here_btn')}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onChange} accessibilityRole="button" style={{ alignSelf: 'center', minHeight: 40, justifyContent: 'center', paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: '#4A5361', textDecorationLine: 'underline' }}>{w('change_answer')}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
