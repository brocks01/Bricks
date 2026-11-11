# 08. Code status (what is actually built, 11 Nov 2026)

## Honest summary
- **Built:** a starter Expo app (`bricks/app`) with a web middle frame, four tabs and sample data. These screens were built ahead of any approved design, so treat them as a **throw-away starter**, not the product. A PostgreSQL database is ready (no tables yet).
- **Not built:** the backend (no code), any table, login, API, voice input, notifications, the website, sponsors, money records.
- **Not approved yet:** the navigation structure, the screen designs and the backend structure in the other documents.

## Repo layout
```
bricks/
  README.md  .gitignore
  platform-docs/   public docs (index pages and llms.txt only; no content written)
  team-docs/       internal docs (vision, feature list, schema, modules, app plan, decisions)
  master-docs/     this snapshot pack
  backend/         README, .env.example, db/migrations (empty). .env holds secrets: never share it.
  frontend/        empty (README only)
  app/             Expo app (see below)
  shared/          empty (README only)
```

## Database (ready, empty)
- Local **PostgreSQL 16.15** on port 5432, database `bricks`, owned by role `bricks_app`; extensions PostGIS 3.6, pgcrypto, pg_trgm; PostGIS distance query tested.
- Connection details are in `backend/.env` (`DATABASE_URL`, `JWT_SECRET`); the file is gitignored and not included in this pack.
- The schema to build is in `05_database_schema.md`; migrations will use Alembic (not set up yet).

## App (`bricks/app`)
- Expo SDK 58, React 19.3, React Native 0.88, Expo Router, expo-speech, react-native-web.
- Runs on the web at http://localhost:8081 (`npx expo start --web --port 8081`); type check passes; clicked through Community and Events in a browser; Help (speech) not tested; not tested in Expo Go.
- `src/navigation/places.ts` is the single map of places (tab bar and spoken commands read it).
- `src/components/PhoneFrame.tsx` centres the app in a 420 px column on wide web screens.
- Screens use `src/data/mock.ts` sample data (invented names). Help accepts a typed command, finds a place by words and speaks a reply.

## Full source of the app files
The appendix below is generated from the files at snapshot time.

### `app/app.json`
```json
{
  "expo": {
    "name": "Bricks",
    "slug": "bricks",
    "scheme": "bricks",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "ios": { "supportsTablet": false },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": { "bundler": "metro", "output": "single", "favicon": "./assets/favicon.png" },
    "plugins": ["expo-router"]
  }
}
```

### `app/package.json`
```json
{
    "name":  "app",
    "version":  "1.0.0",
    "main":  "expo-router/entry",
    "dependencies":  {
                         "@expo/metro-runtime":  "~58.0.17",
                         "expo":  "~58.0.23",
                         "expo-constants":  "~58.0.15",
                         "expo-linking":  "~58.0.16",
                         "expo-router":  "~58.0.30",
                         "expo-speech":  "~58.0.3",
                         "expo-status-bar":  "~58.0.4",
                         "react":  "19.3.0",
                         "react-dom":  "19.3.0",
                         "react-native":  "0.88.1",
                         "react-native-safe-area-context":  "~5.11.1",
                         "react-native-screens":  "~4.30.1",
                         "react-native-web":  "^0.21.4"
                     },
    "devDependencies":  {
                            "@types/react":  "~19.3.0",
                            "typescript":  "~6.0.3"
                        },
    "scripts":  {
                    "start":  "expo start",
                    "android":  "expo start --android",
                    "ios":  "expo start --ios",
                    "web":  "expo start --web"
                },
    "private":  true
}
```

### `app/src/app/(tabs)/_layout.tsx`
```tsx
import { Tabs } from 'expo-router';
import { PLACES } from '../../navigation/places';
import { colors } from '../../theme/tokens';

// The bottom bar is built from the one map of places.
export default function TabsLayout() {
  const tabs = PLACES.filter((p) => p.tab);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 15, fontWeight: '700' },
        tabBarStyle: { height: 64, paddingTop: 8, paddingBottom: 8, backgroundColor: colors.card, borderTopColor: colors.line },
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
      }}
    >
      {tabs.map((p) => (
        <Tabs.Screen key={p.id} name={p.path === '/' ? 'index' : p.path.slice(1)} options={{ title: p.title }} />
      ))}
    </Tabs>
  );
}
```

### `app/src/app/(tabs)/events.tsx`
```tsx
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Body, Button, Card, Screen } from '../../components/ui';
import { events } from '../../data/mock';
import { colors, type } from '../../theme/tokens';

export default function Events() {
  const [going, setGoing] = useState<Record<string, boolean>>({});
  return (
    <Screen title="Events" subtitle="Anything your community decides to do together">
      {events.map((e) => {
        const on = !!going[e.id];
        return (
          <Card key={e.id} title={e.title}>
            <Body>{e.when} · {e.place}</Body>
            <View style={{ marginVertical: 8 }}>
              <Text style={[type.small, { color: colors.muted }]}>{e.going + (on ? 1 : 0)} of {e.capacity} going</Text>
            </View>
            <Button label={on ? 'You are going (tap to undo)' : "I'm going"} kind={on ? 'plain' : 'primary'} onPress={() => setGoing({ ...going, [e.id]: !on })} />
          </Card>
        );
      })}
    </Screen>
  );
}
```

### `app/src/app/(tabs)/help.tsx`
```tsx
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { Body, Button, Card, Screen } from '../../components/ui';
import { PLACES, resolveSpoken } from '../../navigation/places';
import { colors, radius, space } from '../../theme/tokens';

// Voice, step 1: type or (later) say a command; the one map of places decides where to go.
export default function Help() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [reply, setReply] = useState('Try: "open events" or "my goals".');

  const go = () => {
    const place = resolveSpoken(text);
    const msg = place ? `Opening ${place.title}.` : "Sorry, I didn't catch that. Try: events, my goals, community.";
    setReply(msg);
    Speech.speak(msg);
    if (place) router.push(place.path as never);
  };

  return (
    <Screen title="Help" subtitle="Everything here can be done by voice. Speech input arrives in the next step.">
      <Card title="Say or type where to go">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="for example: open events"
          placeholderTextColor={colors.muted}
          onSubmitEditing={go}
          style={{ fontSize: 18, borderWidth: 2, borderColor: colors.line, borderRadius: radius.button, padding: space.md, color: colors.ink, backgroundColor: colors.card, marginBottom: space.md }}
        />
        <Button label="Go" onPress={go} />
        <View style={{ height: space.md }} />
        <Body muted>{reply}</Body>
      </Card>

      <Card title="Read this to me">
        <Body muted>Places you can say: {PLACES.map((p) => p.title).join(', ')}.</Body>
        <View style={{ height: space.md }} />
        <Button kind="plain" label="Read the places aloud" onPress={() => Speech.speak(`You can say: ${PLACES.map((p) => p.title).join(', ')}.`)} />
      </Card>
    </Screen>
  );
}
```

### `app/src/app/(tabs)/index.tsx`
```tsx
import { Text, View } from 'react-native';
import { Body, Card, ProgressBar, Screen } from '../../components/ui';
import { community } from '../../data/mock';
import { colors, space, type } from '../../theme/tokens';

export default function CommunityHome() {
  const o = community.objective;
  return (
    <Screen title={community.name} subtitle={`${community.area} · ${community.members} members`}>
      <Card title="What we are building together">
        <Body>{o.title}</Body>
        <ProgressBar value={o.done} max={o.target} />
        <Text style={[type.small, { color: colors.muted }]}>{o.done} of {o.target} {o.unit}</Text>
      </Card>

      <Card title="Today for you">
        {community.today.map((t) => (
          <View key={t} style={{ marginBottom: space.sm }}><Body>{t}</Body></View>
        ))}
      </Card>

      <Card title="People and their responsibilities">
        {community.roles.map((r) => (
          <View key={r.role} style={{ marginBottom: space.sm }}>
            <Body>{r.person} · <Text style={{ fontWeight: '700' }}>{r.role}</Text></Body>
            <Text style={[type.small, { color: colors.muted }]}>Term ends {r.ends}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
```

### `app/src/app/(tabs)/me.tsx`
```tsx
import { Text, View } from 'react-native';
import { Body, Card, ProgressBar, Screen } from '../../components/ui';
import { goals, stepsThisWeek } from '../../data/mock';
import { colors, type } from '../../theme/tokens';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Me() {
  const max = Math.max(...stepsThisWeek);
  return (
    <Screen title="Me" subtitle="Your goals and your week. Only you can see this.">
      <Card title="My goals">
        {goals.map((g) => (
          <View key={g.id} style={{ marginBottom: 12 }}>
            <Body>{g.text}</Body>
            <ProgressBar value={g.done} max={g.target} />
            <Text style={[type.small, { color: colors.muted }]}>{g.done} of {g.target}</Text>
          </View>
        ))}
      </Card>

      <Card title="My week (steps)">
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8 }}>
          {stepsThisWeek.map((v, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ width: '100%', height: Math.max(6, (100 * v) / max), backgroundColor: colors.accent, borderRadius: 6 }} />
              <Text style={[type.small, { color: colors.muted, marginTop: 4 }]}>{DAYS[i]}</Text>
            </View>
          ))}
        </View>
        <Text style={[type.small, { color: colors.muted, marginTop: 8 }]}>Sample numbers. This is not medical advice.</Text>
      </Card>
    </Screen>
  );
}
```

### `app/src/app/_layout.tsx`
```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PhoneFrame } from '../components/PhoneFrame';

export default function RootLayout() {
  return (
    <PhoneFrame>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </PhoneFrame>
  );
}
```

### `app/src/components/PhoneFrame.tsx`
```tsx
import { ReactNode } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';

// On the web the whole app sits in a phone-sized column in the middle of the page.
// On a real phone (Expo Go or a build) it renders as normal, full screen.
export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web') return <>{children}</>;
  const wide = width > 520;
  return (
    <View style={{ flex: 1, backgroundColor: wide ? '#E9E6DF' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={[
          { width: wide ? 420 : '100%', height: wide ? Math.min(height - 32, 880) : '100%', backgroundColor: '#FBFAF7', overflow: 'hidden' },
          wide && { borderRadius: 28, borderWidth: 1, borderColor: '#D9D5CC', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' },
        ]}
      >
        {children}
      </View>
    </View>
  );
}
```

### `app/src/components/ui.tsx`
```tsx
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, type } from '../theme/tokens';

export function Screen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }}>
      <Text style={[type.h1, { color: colors.ink }]} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={[type.small, { color: colors.muted, marginBottom: space.md }]}>{subtitle}</Text> : <View style={{ height: space.md }} />}
      {children}
    </ScrollView>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[type.body, { color: muted ? colors.muted : colors.ink }]}>{children}</Text>;
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, max ? (100 * value) / max : 0));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: value }} style={styles.track}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.accent }} />
    </View>
  );
}

export function Button({ label, onPress, kind = 'primary' }: { label: string; onPress: () => void; kind?: 'primary' | 'plain' }) {
  const primary = kind === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.btn, primary ? { backgroundColor: colors.accent } : { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent }, pressed && { opacity: 0.85 }]}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: primary ? '#FFFFFF' : colors.accent }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, marginBottom: space.md },
  track: { height: 18, borderRadius: 9, backgroundColor: colors.line, overflow: 'hidden', marginVertical: space.sm },
  btn: { minHeight: 52, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
});
```

### `app/src/data/mock.ts`
```ts
// Sample data only (invented people). Replaced by the real API later.
export const community = {
  name: 'Maple Court Residents (sample)',
  area: 'Sample Estate',
  members: 42,
  objective: { title: 'Fix 20 household things for neighbours', done: 8, target: 20, unit: 'things fixed' },
  today: ['Fix-it morning at 9:00. Three people signed up.', 'Your role: Host, ends 30 Jun'],
  roles: [
    { role: 'Lead', person: 'Mr Tan', ends: 'Jun 2027' },
    { role: 'Events', person: 'Mdm Lim', ends: 'Jun 2027' },
    { role: 'Finance', person: 'Mr Raj', ends: 'Jun 2027' },
    { role: 'Culture', person: 'Mdm Aisha', ends: 'Jun 2027' },
  ],
};

export const events = [
  { id: 'e1', title: 'Fix-it morning', when: 'Sat 9:00', place: 'Block 14 void deck', going: 3, capacity: 15 },
  { id: 'e2', title: 'Evening walk', when: 'Daily 18:00', place: 'Estate garden', going: 11, capacity: 30 },
  { id: 'e3', title: 'Story circle', when: 'Sun 16:00', place: 'Community room', going: 7, capacity: 20 },
];

export const goals = [
  { id: 'g1', text: 'Walk three mornings a week', done: 2, target: 3 },
  { id: 'g2', text: 'Teach one recipe this month', done: 0, target: 1 },
];

export const stepsThisWeek = [3200, 4100, 2800, 5200, 4600, 3900, 5100]; // Mon..Sun, private by default
```

### `app/src/navigation/places.ts`
```ts
// The ONE map of places. The tab bar, voice commands, deep links and (later) the phone agent all read this list.
// To add a screen: add a route file, then add it here once.
export type Place = {
  id: string;
  title: string;
  path: string; // expo-router path
  tab: boolean; // shown in the bottom bar
  say: string[]; // words a person may say to go there
};

export const PLACES: Place[] = [
  { id: 'community', title: 'Community', path: '/', tab: true, say: ['home', 'community', 'my community', 'neighbourhood'] },
  { id: 'events', title: 'Events', path: '/events', tab: true, say: ['events', 'event', 'what is on', 'activities'] },
  { id: 'me', title: 'Me', path: '/me', tab: true, say: ['me', 'my goals', 'goals', 'health', 'my health', 'profile'] },
  { id: 'help', title: 'Help', path: '/help', tab: true, say: ['help', 'talk', 'speak', 'voice'] },
];

export function resolveSpoken(text: string): Place | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  // longest phrase first so "my goals" beats "me"
  const pairs = PLACES.flatMap((p) => p.say.map((s) => ({ p, s }))).sort((a, b) => b.s.length - a.s.length);
  const hit = pairs.find(({ s }) => t.includes(s));
  return hit ? hit.p : null;
}
```

### `app/src/theme/tokens.ts`
```ts
// Design tokens. Large, readable text; plain colours. Change here, not in screens.
export const colors = {
  bg: '#FBFAF7',
  card: '#FFFFFF',
  ink: '#1B2430',
  muted: '#566170',
  line: '#D9DEE5',
  accent: '#0F6E56',
  accentSoft: '#E1F5EE',
  warn: '#8A5A00',
  warnSoft: '#FDF1D6',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const type = {
  h1: { fontSize: 26, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 18, lineHeight: 26 },
  small: { fontSize: 15, lineHeight: 21 },
};

export const radius = { card: 16, pill: 999, button: 14 };
```
