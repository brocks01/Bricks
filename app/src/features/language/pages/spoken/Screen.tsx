import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, ChoiceChips, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { SPOKEN_LANGUAGES, cleanSpoken, saveSpoken, spokenStore } from '../../../../i18n/spoken';
import { El, useAction, useField, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore, updateProfile } from '../../../../session/store';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { languageSpoken as page } from './page';

/**
 * The languages the person SPEAKS to Wisdom, and the one they prefer to talk in. The choice is saved
 * on the PHONE first (this page is reachable from the welcome screen before any account exists) and
 * copied into the account when there is one, so a guest talk already follows their languages.
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

  const toggle = (c: string) => {
    setSaved(false);
    setSpoken((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  };

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
      <Text style={[type.small, { color: colors.ink, fontWeight: '700', marginBottom: space.xs }]}>{w('spoken')}</Text>
      <Text style={[type.small, { color: colors.muted, marginBottom: space.sm }]}>{w('spokenHint')}</Text>
      <El page={page} id="spoken">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md }}>
          {SPOKEN_LANGUAGES.map((l) => {
            const on = spoken.includes(l.code);
            return (
              <Pressable
                key={l.code}
                onPress={() => toggle(l.code)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.accent : colors.card, borderWidth: 1, borderColor: on ? colors.accent : colors.line }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: on ? '#FFFFFF' : colors.ink }}>{l.native}</Text>
              </Pressable>
            );
          })}
        </View>
      </El>
      {spoken.length > 1 ? (
        <El page={page} id="commLanguage">
          <ChoiceChips
            label={w('commLanguage')}
            value={comm && spoken.includes(comm) ? comm : spoken[0]}
            onChange={setComm}
            options={spoken.map((c) => ({ value: c, label: SPOKEN_LANGUAGES.find((l) => l.code === c)?.native ?? c }))}
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
