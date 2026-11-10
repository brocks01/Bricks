import { Redirect } from 'expo-router';

/** The app opens on Home. (Onboarding will gate this in iteration 1.3.) */
export default function Index() {
  return <Redirect href="/home" />;
}
