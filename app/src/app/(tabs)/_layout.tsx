import { Tabs } from 'expo-router';
import { tabPages } from '../../navigation';

// The pages of the five tabs come from the registry. The bottom bar itself is drawn once in the root layout.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={() => null}>
      {tabPages().map((p) => (
        <Tabs.Screen key={p.key} name={p.route === '/' ? 'index' : p.route.slice(1)} />
      ))}
    </Tabs>
  );
}
