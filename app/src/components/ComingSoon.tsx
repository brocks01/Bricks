import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useT } from '../i18n';
import { El, usePageWords } from '../kit';
import type { PageDef } from '../navigation/types';
import { colors, space, type } from '../theme/tokens';
import { Screen } from './ui';

/** A tab whose feature is not built yet. No sample data: only its name and a plain "Coming soon". */
export function ComingSoon({ page, icon }: { page: Pick<PageDef, 'key' | 'elements'>; icon: keyof typeof Ionicons.glyphMap }) {
  const w = usePageWords(page);
  const t = useT();
  return (
    <Screen title={w('heading')}>
      <El page={page} id="soon">
        <View style={{ alignItems: 'center', paddingVertical: space.xl * 2 }}>
          <Ionicons name={icon} size={56} color={colors.accent} />
          <Text style={[type.h2, { color: colors.ink, marginTop: space.md }]}>{t('common.comingSoon')}</Text>
          <Text style={[type.body, { color: colors.muted, marginTop: space.xs, textAlign: 'center' }]}>{t('common.comingSoonBody')}</Text>
        </View>
      </El>
    </Screen>
  );
}
