import { Redirect, type Href } from 'expo-router';

import { useOnboarding } from '@/state/onboarding';

/**
 * Where the app opens: Home once set up; otherwise onboarding, resuming on the
 * screen they were last on (the root layout waits for saved progress to load).
 */
export default function Index() {
  const completed = useOnboarding((s) => s.completed);
  const resumeAt = useOnboarding((s) => s.resumeAt);
  if (completed) return <Redirect href="/home" />;
  return <Redirect href={(resumeAt ?? '/onboarding') as Href} />;
}
