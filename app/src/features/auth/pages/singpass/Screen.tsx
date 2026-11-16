import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { El, usePageData, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { loadDemoProfiles, signInAsDemo, startDemo, type DemoProfile } from '../../../../session/store';
import { colors, radius, space, tints, type } from '../../../../theme/tokens';
import { Frame, ListCard } from '../../../onboarding/kit';
import { authSingpass as page } from './page';

const AGE: Record<string, string> = { under40: 'o_age_u40', '40to59': 'o_age_4059', '60plus': 'o_age_60' };
const ROLE_ORDER = ['share', 'care', 'help', 'learn', 'connect'];

/** A mock Singpass login. No real Singpass is contacted: the visitor picks a demo profile (a seeded person, circles and stories included) or starts a new one. */
export default function SingpassMock() {
  const w = usePageWords(page);
  const go = useNavigate();
  const [profiles, setProfiles] = useState<DemoProfile[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadDemoProfiles().then(setProfiles).catch(() => { setProfiles([]); });
  }, []);

  const enter = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setFailed(false);
    try { await fn(); } catch { setFailed(true); setBusy(false); } // on success the app moves on by itself
  };
  const blurb = (p: DemoProfile) => {
    const role = ROLE_ORDER.find((r) => p.roles.includes(r)) ?? 'connect';
    return [w(`sp_r_${role}`), p.age_band ? w(AGE[p.age_band] ?? 'o_age_60') : '', p.area ?? ''].filter(Boolean).join(' · ');
  };

  usePageData(page, profiles ? {
    values: [{ label: w('heading'), value: w('sp_demo') }],
    images: [],
    lists: [{ label: w('heading'), items: profiles.map((p, k) => ({ label: p.name, detail: blurb(p), actions: [{ id: `profile${k + 1}`, label: p.name, run: () => void enter(() => signInAsDemo(p.id)) }] })) }],
    actions: [{ id: 'newProfile', label: w('sp_new'), run: () => void enter(startDemo) }],
  } : null);
  return (
    <Frame onBack={() => go('auth.signIn')} backLabel={w('o_back')} top={
      <View style={{ alignItems: 'center', paddingVertical: space.lg }}>
        <Image source={require('../../../../../assets/brand/singpass.png')} accessibilityLabel="Singpass" resizeMode="contain" style={{ width: 200, height: 35 }} />
      </View>
    } title={w('heading')} hint={w('sp_demo')}>
      {(profiles ?? []).map((p) => (
        <Pressable key={p.id} onPress={() => void enter(() => signInAsDemo(p.id))} disabled={busy} accessibilityRole="button" accessibilityLabel={p.name}
          style={{ minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, marginBottom: space.md, borderRadius: radius.card, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, opacity: busy ? 0.6 : 1 }}>
          <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: tints.green }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.accent }}>{p.name.trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontWeight: '800', color: colors.ink }}>{p.name}</Text>
            <Text style={[type.small, { color: colors.muted, marginTop: 2 }]}>{blurb(p)}</Text>
            {p.circles ? <Text style={[type.small, { color: colors.muted }]}>{w('sp_circles', { n: p.circles })}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.ink} accessible={false} />
        </Pressable>
      ))}
      <El page={page} id="newProfile">
        <ListCard icon="sparkles-outline" title={w('sp_new')} line={w('sp_new_l')} onPress={() => void enter(startDemo)} />
      </El>
      {failed ? <Text style={{ color: colors.danger, fontWeight: '600' }}>{w('failed')}</Text> : null}
    </Frame>
  );
}
