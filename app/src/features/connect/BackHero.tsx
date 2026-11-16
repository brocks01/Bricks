// A sub-screen that keeps its own header (a greeting, a counter) and still has THE floating Back button of B1, in the same place as
// every other sub-screen. `back={false}` (for example the picker opened as an onboarding step) keeps the ordinary app header instead.
import { ReactNode } from 'react';
import { View } from 'react-native';
import { BACK_SPACE, BackButton } from '../../components/BackButton';
import { Screen } from '../../components/ui';
import { space } from '../../theme/tokens';

export function BackHeroScreen({ title, hero, back = true, children }: { title: string; hero: ReactNode; back?: boolean; children: ReactNode }) {
  if (!back) return <Screen title={title} hero={hero}>{children}</Screen>;
  return (
    <View style={{ flex: 1 }}>
      <Screen plain title={title} hero={<View style={{ paddingTop: BACK_SPACE - space.lg }}>{hero}</View>}>{children}</Screen>
      <BackButton />
    </View>
  );
}
