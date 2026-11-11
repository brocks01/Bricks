import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useAgent } from '../../../../agent';
import { Button, Card, Screen } from '../../../../components/ui';
import { getLog } from '../../../../navigation';
import { colors, radius, space } from '../../../../theme/tokens';

// Developer console: type a tool and its JSON input, see the result. Same tools the voice agent will use.
export default function Console() {
  const agent = useAgent();
  const [tool, setTool] = useState('search');
  const [args, setArgs] = useState('{"query":"profile"}');
  const [out, setOut] = useState('');

  const run = async (name = tool, raw = args) => {
    try {
      setOut(JSON.stringify(await agent.call(name, raw.trim() ? JSON.parse(raw) : {}), null, 2));
    } catch (e) {
      setOut(`Error: ${(e as Error).message}`);
    }
  };
  const quick = (name: string, raw: string) => {
    setTool(name);
    setArgs(raw);
    void run(name, raw);
  };
  const box = { fontSize: 15, borderWidth: 2, borderColor: colors.line, borderRadius: radius.button, padding: space.md, color: colors.ink, backgroundColor: colors.card } as const;

  return (
    <Screen title="Agent test console" subtitle="Developer tool. Walks the same tree the voice agent will use.">
      <Card title="Try a tool">
        <Text style={{ color: colors.muted }}>{agent.tools.map((x) => x.name).join(', ')}</Text>
        <View style={{ height: space.sm }} />
        <TextInput value={tool} onChangeText={setTool} autoCapitalize="none" style={box} accessibilityLabel="Tool name" />
        <View style={{ height: space.sm }} />
        <TextInput value={args} onChangeText={setArgs} autoCapitalize="none" multiline style={[box, { minHeight: 70 }]} accessibilityLabel="Input as JSON" />
        <View style={{ height: space.md }} />
        <Button label="Run" onPress={() => void run()} />
      </Card>
      <Card title="Walk the tree">
        <View style={{ gap: space.sm }}>
          <Button kind="plain" label="tree: modules" onPress={() => quick('tree', '{}')} />
          <Button kind="plain" label="tree: me" onPress={() => quick('tree', '{"path":"me"}')} />
          <Button kind="plain" label="tree: me.edit" onPress={() => quick('tree', '{"path":"me.edit"}')} />
          <Button kind="plain" label="docs: me.edit.displayName" onPress={() => quick('docs', '{"path":"me.edit.displayName"}')} />
        </View>
      </Card>
      <Card title="Act (watch the glow)">
        <View style={{ gap: space.sm }}>
          <Button kind="plain" label="run me/summary" onPress={() => quick('run', '{"skill":"me/summary","input":{}}')} />
          <Button kind="plain" label="open me.edit" onPress={() => quick('open', '{"path":"me.edit"}')} />
          <Button kind="plain" label="fill language.pick.language = hi" onPress={() => quick('fill', '{"path":"language.pick.language","value":"hi"}')} />
          <Button kind="plain" label="run auth/signOut (needs approval)" onPress={() => quick('run', '{"skill":"auth/signOut","input":{}}')} />
          <Button kind="plain" label="read (this page)" onPress={() => quick('read', '{}')} />
        </View>
      </Card>
      <Card title="Result">
        <ScrollView horizontal><Text selectable style={{ fontFamily: 'monospace', fontSize: 13, color: colors.ink }}>{out || '(nothing yet)'}</Text></ScrollView>
      </Card>
      <Card title="What the agent did (log)">
        <Text selectable style={{ fontSize: 13, color: colors.muted }}>{getLog().slice(-8).map((e) => JSON.stringify(e)).join('\n') || '(empty)'}</Text>
      </Card>
    </Screen>
  );
}
