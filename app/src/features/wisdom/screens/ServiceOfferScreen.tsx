import { useEffect, useState } from 'react';
import { CATEGORIES, createListing, getGuide, TIERS, type Guide, type MarketCategory, type MarketTier } from '../../../api/wisdom';
import { Notice } from '../../../components/blocks';
import { Button, ChoiceChips, ErrorText, Field, Screen } from '../../../components/ui';
import { El, useAction, useField, usePageWords } from '../../../kit';
import { useNavigate } from '../../../navigation';
import { wisdomServiceOffer as page } from '../pages';
import { categoryWord, money, refusalWord, tierWord } from '../serviceUi';

/** Offer a service by the hour. Moved here from the Marketplace tab; the server's endpoints did not change. */
export default function ServiceOfferScreen() {
  const w = usePageWords(page);
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MarketCategory>('other');
  const [tier, setTier] = useState<MarketTier>('skilled');
  const [years, setYears] = useState('');
  const [description, setDescription] = useState('');
  const [proof, setProof] = useState('');
  const [rate, setRate] = useState('');
  const [area, setArea] = useState('');
  const [guide, setGuide] = useState<Guide | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getGuide(tier).then(setGuide).catch(() => setGuide(null));
  }, [tier]);

  const num = (s: string) => {
    const v = parseFloat(s.replace(',', '.'));
    return Number.isFinite(v) && v >= 0 ? v : null;
  };

  const publish = async () => {
    setError(null);
    if (title.trim().length < 3) return setError(w('need_title'));
    setBusy(true);
    try {
      const r = await createListing({
        title: title.trim(),
        category,
        tier,
        description: description.trim() || undefined,
        experience_years: Math.min(70, Math.round(num(years) ?? 0)),
        proof_text: proof.trim() || undefined,
        rate_per_hour: rate.trim() ? num(rate) : null,
        area_name: area.trim() || undefined,
      });
      navigate('wisdom.service', { id: r.id });
    } catch (e) {
      setError(w(refusalWord(e)));
    } finally {
      setBusy(false);
    }
  };

  useField(page, 'title', title, (v) => setTitle(String(v)));
  useField(page, 'category', category, (v) => CATEGORIES.includes(v as MarketCategory) && setCategory(v as MarketCategory));
  useField(page, 'tier', tier, (v) => TIERS.includes(v as MarketTier) && setTier(v as MarketTier));
  useField(page, 'years', years, (v) => setYears(String(v)));
  useField(page, 'description', description, (v) => setDescription(String(v)));
  useField(page, 'proof', proof, (v) => setProof(String(v)));
  useField(page, 'rate', rate, (v) => setRate(String(v)));
  useField(page, 'area', area, (v) => setArea(String(v)));
  useAction(page, 'publish', publish);

  return (
    <Screen back title={w('heading')}>
      <ErrorText>{error}</ErrorText>
      <El page={page} id="title"><Field label={w('f_title')} value={title} onChangeText={setTitle} maxLength={80} /></El>
      <El page={page} id="category">
        <ChoiceChips label={w('f_category')} options={CATEGORIES.map((c) => ({ value: c, label: w(categoryWord(c)) }))} value={category} onChange={(v) => setCategory(v as MarketCategory)} />
      </El>
      <El page={page} id="tier">
        <ChoiceChips label={w('f_tier')} options={TIERS.map((c) => ({ value: c, label: w(tierWord(c)) }))} value={tier} onChange={(v) => setTier(v as MarketTier)} />
      </El>
      {guide ? <Notice text={w('guide_line', { low: guide.low, high: guide.high, cur: guide.currency })} /> : null}
      <El page={page} id="years"><Field label={w('f_years')} value={years} onChangeText={setYears} keyboardType="numeric" maxLength={2} /></El>
      <El page={page} id="description"><Field label={w('f_desc')} value={description} onChangeText={setDescription} maxLength={1500} /></El>
      <El page={page} id="proof"><Field label={w('f_proof')} value={proof} onChangeText={setProof} placeholder={w('f_proof_hint')} maxLength={1000} /></El>
      <El page={page} id="rate"><Field label={w('f_rate')} value={rate} onChangeText={setRate} keyboardType="numeric" maxLength={6} placeholder={guide ? money(guide.low) : undefined} /></El>
      <El page={page} id="area"><Field label={w('f_area')} value={area} onChangeText={setArea} maxLength={120} /></El>
      <Notice text={w('adviceNote')} icon="information-circle-outline" />
      <El page={page} id="publish"><Button label={w('save_listing')} icon="checkmark" disabled={busy} onPress={publish} /></El>
    </Screen>
  );
}
