import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button, ChoiceChips, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { SPOKEN_LANGUAGES, cleanSpoken, saveSpoken, spokenStore } from '../../../../i18n/spoken';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore, updateProfile } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { languageSpoken as page } from './page';

// English names, so a person can also search "Tamil" and find தமிழ். The chips themselves stay in each language's own script.
const ENGLISH: Record<string, string> = {
  en: 'English', hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', mr: 'Marathi', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', pa: 'Punjabi', ur: 'Urdu',
  or: 'Odia', as: 'Assamese', bho: 'Bhojpuri', mai: 'Maithili', ne: 'Nepali', kok: 'Konkani', zh: 'Chinese Mandarin', yue: 'Cantonese', nan: 'Hokkien',
  teo: 'Teochew', ms: 'Malay', id: 'Indonesian',
};
const SUGGEST = ['en', 'zh', 'ms', 'ta', 'hi', 'bn']; // shown first, before anything is typed

/**
 * The languages the person SPEAKS to Wisdom, and the one they prefer to talk in. The choice is saved
 * on the PHONE first (this page is reachable from the welcome screen before any account exists) and
 * copied into the account when there is one, so a guest talk already follows their languages.
 * Added one at a time from a search box; the chosen ones show as chips that can be removed.
 */
export default function SpokenLanguages() {
  const w = usePageWords(page);
  const go = useNavigate();
  const { status, user } = useStore(sessionStore);
  const account = user?.spoken_languages ?? [];
  const [spoken, setSpoken] = useState<string[]>(cleanSpoken(account.length ? account : spokenStore.get().spoken));
  const [comm, setComm] = useState<string | null>(user?.comm_language ?? spokenStore.get().comm);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const add = (c: string) => {
    setSaved(false);
    setSpoken((l) => (l.includes(c) ? l : [...l, c]));
    setQ('');
  };
  const remove = (c: string) => {
    setSaved(false);
    setSpoken((l) => l.filter((x) => x !== c));
  };

  const native = (c: string) => SPOKEN_LANGUAGES.find((l) => l.code === c)?.native ?? c;
  const needle = q.trim().toLowerCase();
  const pool = SPOKEN_LANGUAGES.filter((l) => !spoken.includes(l.code));
  const matches = needle
    ? pool
        .filter((l) => l.native.toLowerCase().includes(needle) || (ENGLISH[l.code] ?? '').toLowerCase().includes(needle) || l.code === needle)
        .sort((a, b) => Number((ENGLISH[b.code] ?? '').toLowerCase().startsWith(needle)) - Number((ENGLISH[a.code] ?? '').toLowerCase().startsWith(needle)))
    : [...pool].sort((a, b) => (SUGGEST.indexOf(a.code) + 1 || 99) - (SUGGEST.indexOf(b.code) + 1 || 99));
  const shown = matches.slice(0, 6);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const main = comm && spoken.includes(comm) ? comm : spoken[0] ?? null;
      await saveSpoken(spoken, main); // on the phone first: this is what the next talk follows
      if (status === 'in' && user) {
        try {
          await updateProfile({ spoken_languages: spoken, comm_language: main }); // and to the account when there is one
        } catch {
          /* the phone keeps the choice; the profile form saves it again later */
        }
      }
      setSaved(true);
      setTimeout(() => go(status === 'in' ? 'me.index' : 'auth.welcome'), 700);
    } finally {
      setBusy(false);
    }
  };

  useField(page, 'spoken', spoken.join(','), (v) => { setSaved(false); setSpoken(cleanSpoken(v)); });
  useField(page, 'commLanguage', comm ?? '', (v) => setComm(cleanSpoken(v)[0] ?? null));
  useAction(page, 'save', () => void save());

  return (
    <Screen title={w('heading')} back>
      <Text style={[type.body, { color: colors.muted, marginBottom: space.md }]}>{w('intro')}</Text>

      <El page={page} id="spoken">
        <Text style={[type.small, { color: colors.ink, fontWeight: '700', marginBottom: space.sm }]}>{w('yourLanguages')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md, minHeight: 44 }}>
          {spoken.length === 0 ? <Text style={[type.small, { color: colors.muted }]}>{w('spokenHint')}</Text> : null}
          {spoken.map((c) => (
            <Pressable
              key={c}
              onPress={() => remove(c)}
              accessibilityRole="button"
              accessibilityLabel={`${ENGLISH[c] ?? c} ✕`}
              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 12, borderRadius: radius.pill, backgroundColor: colors.accent }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>{native(c)}</Text>
              <Ionicons name="close-circle" size={20} color="#FFFFFF" accessible={false} />
            </Pressable>
          ))}
        </View>
      </El>

      <View style={{ marginBottom: space.md, zIndex: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderRadius: radius.button, backgroundColor: colors.card, borderWidth: 1.5, borderColor: open ? colors.accent : colors.line }}>
          <Ionicons name="search" size={20} color={colors.muted} accessible={false} />
          <TextInput
            value={q}
            onChangeText={(t) => { setQ(t); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
            placeholder={w('searchLanguage')}
            placeholderTextColor={colors.muted}
            accessibilityLabel={w('searchLanguage')}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ flex: 1, fontSize: 17, color: colors.ink, paddingVertical: 12, outlineStyle: 'none' } as never}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} accessibilityRole="button" accessibilityLabel="Clear" hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.muted} accessible={false} />
            </Pressable>
          ) : null}
        </View>
        {open ? (
          <View style={{ marginTop: 6, borderRadius: radius.button, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
            {shown.length === 0 ? (
              <Text style={[type.small, { color: colors.muted, padding: space.md }]}>{w('nothingFound')}</Text>
            ) : (
              shown.map((l, i) => (
                <Pressable
                  key={l.code}
                  onPress={() => add(l.code)}
                  accessibilityRole="button"
                  accessibilityLabel={`${ENGLISH[l.code] ?? l.native}`}
                  style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}
                >
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{l.native}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[type.small, { color: colors.muted }]}>{ENGLISH[l.code]}</Text>
                    <Ionicons name="add-circle" size={22} color={colors.accent} accessible={false} />
                  </View>
                </Pressable>
              ))
            )}
          </View>
        ) : null}
      </View>

      {spoken.length > 1 ? (
        <El page={page} id="commLanguage">
          <ChoiceChips
            label={w('commLanguage')}
            value={comm && spoken.includes(comm) ? comm : spoken[0]}
            onChange={setComm}
            options={spoken.map((c) => ({ value: c, label: native(c) }))}
          />
        </El>
      ) : null}
      {saved ? <Text style={[type.small, { color: colors.accent, fontWeight: '700', marginBottom: space.sm }]}>{w('saved')}</Text> : null}
      <El page={page} id="save">
        <Button label={w('save')} onPress={() => void save()} disabled={busy} icon="checkmark" />
      </El>
    </Screen>
  );
}
