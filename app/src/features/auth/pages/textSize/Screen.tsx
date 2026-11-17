import { useStore } from '../../../../core/store';
import { useAction, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { prefs, setPref } from '../../../../prefs/store';
import { TextSizeBody } from '../../../onboarding/bodies';
import { Frame } from '../../../onboarding/kit';
import { authTextSize as page } from './page';

/** Screen 2: the text size. Small, Normal, Large; the whole screen resizes the moment one is tapped. */
export default function TextSize() {
  const w = usePageWords(page);
  const go = useNavigate();
  const { textSize } = useStore(prefs);
  useAction(page, 'small', () => setPref({ textSize: 'normal' }));
  useAction(page, 'normal', () => setPref({ textSize: 'large' }));
  useAction(page, 'large', () => setPref({ textSize: 'larger' }));
  useAction(page, 'next', () => go('auth.who'));
  return (
    <Frame inlineTitle title={w('heading')} hint={w('o_size_h')} onBack={() => go('auth.welcome')} backLabel={w('o_back')} primary={{ label: w('o_next'), onPress: () => go('auth.who') }}>
      <TextSizeBody w={w} value={textSize} onPick={(v) => setPref({ textSize: v })} />
    </Frame>
  );
}
