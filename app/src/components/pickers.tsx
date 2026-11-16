// Pickers for lists of things, so nobody types codes or commas: a searchable language dropdown you can pick several from, and a type-and-add list for free words.
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SPOKEN_ENGLISH, SPOKEN_LANGUAGES } from '../i18n/spoken';
import { colors, radius, space, type } from '../theme/tokens';

const SUGGEST = ['en', 'zh', 'ms', 'ta', 'hi', 'bn']; // shown first, before anything is typed
const native = (c: string) => SPOKEN_LANGUAGES.find((l) => l.code === c)?.native ?? c;

/** The chosen things as chips with a ✕ to remove (green, like the main button). */
function Chosen({ items, label, onRemove, empty }: { items: string[]; label: (c: string) => string; onRemove: (c: string) => void; empty?: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm }}>
      {items.length === 0 && empty ? <Text style={[type.small, { color: colors.muted }]}>{empty}</Text> : null}
      {items.map((c) => (
        <Pressable
          key={c}
          onPress={() => onRemove(c)}
          accessibilityRole="button"
          accessibilityLabel={`${label(c)} ✕`}
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 12, borderRadius: radius.pill, backgroundColor: colors.accent }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.card }}>{label(c)}</Text>
          <Ionicons name="close-circle" size={20} color={colors.card} accessible={false} />
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Several languages from a searchable dropdown. `value` is a list of language codes (en, ta, ms...). Chosen ones show as chips on top; tap one to remove it.
 * Search works in English ("Tamil") or in the language's own script. Before typing, the dropdown suggests the most common ones.
 */
export function LanguageMultiPicker({ value, onChange, words }: { value: string[]; onChange: (v: string[]) => void; words: { search: string; none: string; chosen: string } }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const needle = q.trim().toLowerCase();
  const pool = SPOKEN_LANGUAGES.filter((l) => !value.includes(l.code));
  const english = (c: string) => (SPOKEN_ENGLISH[c] ?? '').toLowerCase();
  const matches = needle
    ? pool.filter((l) => l.native.toLowerCase().includes(needle) || english(l.code).includes(needle) || l.code === needle).sort((a, b) => Number(english(b.code).startsWith(needle)) - Number(english(a.code).startsWith(needle)))
    : [...pool].sort((a, b) => (SUGGEST.indexOf(a.code) + 1 || 99) - (SUGGEST.indexOf(b.code) + 1 || 99));
  const shown = matches.slice(0, 6);
  const add = (c: string) => {
    onChange(value.includes(c) ? value : [...value, c]);
    setQ('');
  };
  return (
    <View style={{ marginBottom: space.md, zIndex: 10 }}>
      <Text style={[type.small, { color: colors.ink, fontWeight: '700', marginBottom: space.sm }]}>{words.chosen}</Text>
      <Chosen items={value} label={native} onRemove={(c) => onChange(value.filter((x) => x !== c))} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderRadius: radius.button, backgroundColor: colors.card, borderWidth: 1.5, borderColor: open ? colors.accent : colors.line }}>
        <Ionicons name="search" size={20} color={colors.muted} accessible={false} />
        <TextInput
          value={q}
          onChangeText={(t) => { setQ(t); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder={words.search}
          placeholderTextColor={colors.muted}
          accessibilityLabel={words.search}
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
            <Text style={[type.small, { color: colors.muted, padding: space.md }]}>{words.none}</Text>
          ) : (
            shown.map((l, i) => (
              <Pressable
                key={l.code}
                onPress={() => add(l.code)}
                accessibilityRole="button"
                accessibilityLabel={SPOKEN_ENGLISH[l.code] ?? l.native}
                style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}
              >
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{l.native}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[type.small, { color: colors.muted }]}>{SPOKEN_ENGLISH[l.code]}</Text>
                  <Ionicons name="add-circle" size={22} color={colors.accent} accessible={false} />
                </View>
              </Pressable>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

/** A list of free words (skills, topics): type one, tap Add (or press Enter), and it becomes a chip. Tap a chip to remove it. */
export function TagInput({ value, onChange, words }: { value: string[]; onChange: (v: string[]) => void; words: { placeholder: string; add: string } }) {
  const [t, setT] = useState('');
  const commit = () => {
    const v = t.trim();
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setT('');
  };
  return (
    <View style={{ marginBottom: space.md }}>
      <Chosen items={value} label={(c) => c} onRemove={(c) => onChange(value.filter((x) => x !== c))} />
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
        <TextInput
          value={t}
          onChangeText={setT}
          onSubmitEditing={commit}
          returnKeyType="done"
          placeholder={words.placeholder}
          placeholderTextColor={colors.muted}
          accessibilityLabel={words.placeholder}
          style={{ flex: 1, minHeight: 52, fontSize: 17, color: colors.ink, paddingHorizontal: 14, borderRadius: radius.button, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, outlineStyle: 'none' } as never}
        />
        <Pressable onPress={commit} accessibilityRole="button" accessibilityLabel={words.add} style={{ minHeight: 52, paddingHorizontal: 18, borderRadius: radius.button, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.card }}>{words.add}</Text>
        </Pressable>
      </View>
    </View>
  );
}
