import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { audioAvailable } from '../../../../agent/audio';
import { startTalk } from '../../../../agent/live';
import { useHideOrb } from '../../../../agent/orbHidden';
import { useStore } from '../../../../core/store';
import type { LangCode } from '../../../../i18n/languages';
import { languageStore, setLanguage } from '../../../../i18n/store';
import { usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { Go, MicButton, R, RefFrame } from '../../../onboarding/ref';
import { authLanguage as page } from './page';

// The five choices of the reference. "Dialect" (Hokkien, Cantonese ...) is read and written in Chinese, so it shows the app in Chinese.
const CHOICES: { code: LangCode; glyph: string; title: string; sub?: string; dialect?: boolean; icon?: keyof typeof Ionicons.glyphMap }[] = [
  { code: 'en', glyph: 'A', title: 'English' },
  { code: 'zh', glyph: '文', title: '中文 (Mandarin)' },
  { code: 'ms', glyph: '☾', title: 'Malayu' },
  { code: 'ta', glyph: 'அ', title: 'தமிழ் (Tamil)' },
  { code: 'zh', glyph: '', title: 'x_dialect', sub: 'x_dialect_s', dialect: true, icon: 'people' },
];

/** Screen 2: the language. The whole app changes the moment a language is tapped; the mic lets a person say it instead. */
export default function Language() {
  const w = usePageWords(page);
  const go = useNavigate();
  useHideOrb();
  const { code } = useStore(languageStore);
  const next = () => go('auth.signIn');
  const talk = () => void startTalk({ mic: audioAvailable() });
  const picked = (c: (typeof CHOICES)[number]) => (c.dialect ? false : c.code === code);
  usePageData(page, {
    values: [{ label: w('x_lang_t'), value: CHOICES.find(picked)?.title ?? '' }],
    images: [],
    lists: [],
    actions: [
      ...CHOICES.filter((c) => !c.dialect).map((c) => ({ id: `lang${c.code.charAt(0).toUpperCase()}${c.code.slice(1)}`, label: c.title, run: () => { void setLanguage(c.code); } })),
      { id: 'next', label: w('x_next'), run: next },
    ],
  });
  return (
    <RefFrame at={1} onBack={() => go('auth.welcome')} backLabel={w('x_back')} bottom={<Go label={w('x_next')} onPress={next} />}>
      <Text accessibilityRole="header" style={{ fontSize: 32, lineHeight: 38, fontWeight: '800', color: R.ink, marginTop: 14 }}>{w('x_lang_t')}</Text>
      <View style={{ marginTop: 18, gap: 10 }}>
        {CHOICES.map((c, i) => {
          const on = picked(c);
          return (
            <Pressable key={i} onPress={() => void setLanguage(c.code)} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: on ? R.greenSoft : R.card, borderWidth: on ? 2 : 1, borderColor: on ? R.greenLine : R.line }}>
              {c.icon ? <Ionicons name={c.icon} size={26} color="#6A5BD6" accessible={false} /> : <Text style={{ width: 34, fontSize: 26, fontWeight: '700', color: R.orange, textAlign: 'center' }}>{c.glyph}</Text>}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 21, fontWeight: '800', color: R.ink }}>{c.dialect ? w(c.title) : c.title}</Text>
                {c.sub ? <Text style={{ fontSize: 15, color: R.muted }}>{w(c.sub)}</Text> : null}
              </View>
              {on ? <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: R.green, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="checkmark" size={22} color="#FFFFFF" accessible={false} /></View> : null}
            </Pressable>
          );
        })}
      </View>
      <View style={{ marginTop: 26 }}><MicButton onPress={talk} label={w('x_lang_speak')} /></View>
    </RefFrame>
  );
}
