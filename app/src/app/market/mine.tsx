import { Redirect } from 'expo-router';

// My services and bookings moved to Wisdom. This old address still works: it sends you there.
export default function OldMineRoute() {
  return <Redirect href="/wisdom/services" />;
}
