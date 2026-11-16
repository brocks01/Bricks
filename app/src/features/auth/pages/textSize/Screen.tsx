import { useStore } from '../../../../core/store';
import { useAction, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { prefs, setPref } from '../../../../prefs/store';
import { Frame, RadioCard } from '../../../onboarding/kit';
import { authTextSize as page } from './page';

/** Screen 2: the text size. Small, Normal, Large; the whole screen resizes the moment one is tapped. */
export default function TextSize() {
  const w = usePageWords(page);
  const go = useNavigate();
  const { textSize } = useStore(prefs);
  const sizes = [{ v: 'normal' as const, t: 'o_size_small', l: 'o_size_small_l' }, { v: 'large' as const, t: 'o_size_normal', l: 'o_size_normal_l' }, { v: 'larger' as const, t: 'o_size_large', l: 'o_size_large_l' }];
  useAction(page, 'small', () => setPref({ textSize: 'normal' }));
  useAction(page, 'normal', () => setPref({ textSize: 'large' }));
  useAction(page, 'large', () => setPref({ textSize: 'larger' }));
  useAction(page, 'next', () => go('auth.who'));
  return (
    <Frame inlineTitle title={w('heading')} hint={w('o_size_h')} onBack={() => go('auth.welcome')} backLabel={w('o_back')} primary={{ label: w('o_next'), onPress: () => go('auth.who') }}>
      {sizes.map((s) => <RadioCard key={s.v} title={w(s.t)} line={w(s.l)} on={textSize === s.v} onPress={() => setPref({ textSize: s.v })} />)}
    </Frame>
  );
}
