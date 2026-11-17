import { useCallback, useState, type ReactNode } from 'react';
import { ApiError } from '../../api/client';
import { joinOpenCommunity } from '../../api/communityRules';
import { putOnboarding } from '../../api/wisdom';
import { useT } from '../../i18n';
import { GenderAsk } from './GenderAsk';
import './revampWords'; // registers the words
import './rulesWords'; // the words of the join refusals and the gender question

type Target = { id: string; name: string; audience: string };

/**
 * Joining a community from any card, the same way everywhere: the 3-community limit and the other refusals in one calm sentence, never blaming,
 * and for a men-only or women-only circle the person's own answer is asked once (GenderAsk), saved, and the join is tried again.
 */
export function useJoin(onJoined: (c: Target) => void) {
  const t = useT();
  const w = useCallback((k: string, vars?: Record<string, string | number>) => t(`rules.${k}`, vars), [t]);
  const [ask, setAsk] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refuse = useCallback((e: unknown) => {
    const code = e instanceof ApiError ? e.code : '';
    setError(code === 'community_limit' ? t('rv.pick_full')
      : code === 'invite_only' ? w('err_invite')
        : code === 'audience_men' ? w('err_aud_men')
          : code === 'audience_women' ? w('err_aud_women')
            : w('err_failed'));
  }, [t, w]);

  const join = useCallback(async (c: Target): Promise<boolean> => {
    setError(null);
    setNote(null);
    try {
      await joinOpenCommunity(c.id);
      setAsk(null);
      setNote(t('rv.joined', { name: c.name }));
      onJoined(c);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.code === 'gender_needed') setAsk(c);
      else { setAsk(null); refuse(e); }
      return false;
    }
  }, [onJoined, refuse, t]);

  const answer = async (g: 'man' | 'woman') => {
    if (!ask || busy) return;
    setBusy(true);
    try {
      await putOnboarding('basics', { gender: g }); // their own answer, saved once
      await join(ask);
    } catch {
      setAsk(null);
      setError(w('err_failed'));
    } finally {
      setBusy(false);
    }
  };

  const why = ask ? w(ask.audience === 'men' ? 'gender_why_men' : ask.audience === 'women' ? 'gender_why_women' : 'gender_why_any', { name: ask.name }) : '';
  const askNode: ReactNode = ask ? <GenderAsk why={why} w={w} busy={busy} onPick={(g) => void answer(g)} onSkip={() => { setAsk(null); setNote(w('gender_declined')); }} /> : null;
  return { join, askNode, error, note, clear: () => { setError(null); setNote(null); } };
}
