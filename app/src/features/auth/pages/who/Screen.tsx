import { useAction, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { Frame, ListCard } from '../../../onboarding/kit';
import { setWho } from '../../../onboarding/who';
import { authWho as page } from './page';

/** Screen 3: who is setting up. Myself or my family, then sign-in. The choice is kept on the device for the first questions after sign-in. */
export default function Who() {
  const w = usePageWords(page);
  const go = useNavigate();
  const pick = (who: 'myself' | 'family') => { setWho(who); go('auth.signIn'); };
  useAction(page, 'myself', () => pick('myself'));
  useAction(page, 'family', () => pick('family'));
  return (
    <Frame inlineTitle title={w('heading')} onBack={() => go('auth.textSize')} backLabel={w('o_back')}>
      <ListCard icon="person-outline" title={w('who_myself')} line={w('who_myself_line')} onPress={() => pick('myself')} />
      <ListCard icon="people-outline" title={w('who_family')} line={w('who_family_line')} onPress={() => pick('family')} />
      <ListCard icon="business-outline" title={w('who_community')} line={w('who_community_line')} disabled onPress={() => undefined} />
    </Frame>
  );
}
