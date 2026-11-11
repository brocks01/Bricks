import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Screen } from '../../../../components/ui';
import { El, usePageWords } from '../../../../kit';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { connectHub as page } from './page';

// The kinds of things a community can do together. They will all be views over ONE flexible activity system (see product-architecture.md),
// so each tile is a filter, not a separate module. Nothing is built behind them yet: every tile says "Coming soon".
const TILES = [
  ['communities', 'people-outline'],
  ['events', 'calendar-outline'],
  ['clubs', 'albums-outline'],
  ['competitions', 'trophy-outline'],
  ['training', 'school-outline'],
  ['services', 'construct-outline'],
  ['opportunities', 'briefcase-outline'],
  ['contributions', 'cash-outline'],
  ['governance', 'ribbon-outline'],
] as [string, keyof typeof Ionicons.glyphMap][];

export default function ConnectHub() {
  const w = usePageWords(page);
  return (
    <Screen title={w('heading')} subtitle={w('subtitle')} back>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {TILES.map(([id, icon]) => (
          <El key={id} page={page} id={id}>
            <View accessibilityRole="button" accessibilityState={{ disabled: true }} style={{ width: 104, minHeight: 104, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 6, opacity: 0.85 }}>
              <Ionicons name={icon} size={28} color={colors.accent} />
              <Text style={[type.small, { color: colors.ink, textAlign: 'center', fontWeight: '600' }]} numberOfLines={3}>{w(id)}</Text>
            </View>
          </El>
        ))}
      </View>
      <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginTop: space.lg }]}>{w('soon')}</Text>
    </Screen>
  );
}
