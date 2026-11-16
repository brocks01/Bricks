import { Redirect } from 'expo-router';

// The form to offer a service moved to Wisdom. This old address still works: it sends you there.
export default function OldOfferRoute() {
  return <Redirect href="/wisdom/service-offer" />;
}
