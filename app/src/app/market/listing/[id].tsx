import { Redirect, useLocalSearchParams } from 'expo-router';

// The paid sessions moved to Wisdom. This old address still works: it sends you to the same service there.
export default function OldServiceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/wisdom/service/${String(id ?? '')}`} />;
}
