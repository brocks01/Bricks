import { useFocusLive, useSavedState } from '../../../core/useFocusLive';
import { useCallback, useState } from 'react';
import { getMarketEvents } from '../../../api/market';
import { Empty } from '../../../components/blocks';
import { Screen } from '../../../components/ui';
import { useStore } from '../../../core/store';
import { usePageWords } from '../../../kit';
import { sessionStore } from '../../../session/store';
import { MarketDays } from '../MarketDays';
import { marketIndex as page } from '../pages';

/**
 * The Marketplace tab: what is happening near the person, hosted by Active Ageing Centres, malls and others.
 * It shows opportunities only — the paid services listing moved to Wisdom, and nothing is invented here: no events means a calm empty line.
 */
export default function MarketIndex() {
  const w = usePageWords(page);
  const { status } = useStore(sessionStore);
  const [any, setAny] = useSavedState<boolean | null>('market.index.any', null);

  useFocusLive(
    useCallback(() => {
      if (status !== 'in') return;
      getMarketEvents()
        .then((r) => setAny(r.length > 0))
        .catch(() => setAny(false));
    }, [status])
  );

  return (
    <Screen title={w('heading')} subtitle={w('intro')}>
      <MarketDays />
      {any === false ? <Empty text={w('noEvents')} /> : null}
    </Screen>
  );
}
