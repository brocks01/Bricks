import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { familyApi, type PermissionEvent } from '../../../../api/family';
import { Button, ErrorText, Screen } from '../../../../components/ui';
import { useLanguage } from '../../../../i18n';
import { usePageData, usePageWords, type PageDataInput } from '../../../../kit';
import { colors, radius, space, type } from '../../../../theme/tokens';
import { familyHistory as page } from './page';

const KNOWN = ['family_created', 'invite_sent', 'member_joined', 'role_changed', 'member_removed', 'assisted_created', 'delegation_granted', 'delegation_changed', 'delegation_revoked', 'claim_invited', 'claimed'];

export default function PermissionHistory() {
  const w = usePageWords(page);
  const lang = useLanguage();
  const [events, setEvents] = useState<PermissionEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    familyApi.permissionEvents().then((r) => setEvents(r.events)).catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const when = (iso: string) => new Date(iso).toLocaleString(lang, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const word = (a: string) => (KNOWN.includes(a) ? w(a) : w('action', { a }));

  const shown: PageDataInput | null = events
    ? { values: [], images: [], actions: [], lists: [{ label: w('heading'), items: events.slice(0, 20).map((e) => ({ label: word(e.action), detail: when(e.at) })) }] }
    : null;
  usePageData(page, shown);

  if (failed) {
    return (
      <Screen title={w('heading')} back>
        <ErrorText>{w('failed')}</ErrorText>
        <Button label={w('tryAgain')} onPress={load} />
      </Screen>
    );
  }

  return (
    <Screen title={w('heading')} subtitle={w('intro')} back>
      {(events ?? []).length === 0 ? (
        <Text style={[type.body, { color: colors.muted }]}>{w('empty')}</Text>
      ) : (
        (events ?? []).map((e, i) => (
          <View key={`${e.at}-${i}`} style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md, marginBottom: space.sm }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>{word(e.action)}</Text>
            <Text style={[type.small, { color: colors.muted }]}>{when(e.at)}</Text>
          </View>
        ))
      )}
    </Screen>
  );
}
