import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Share, Text, View } from 'react-native';
import { getInvite } from '../../../api/communities';
import { El, useAction, usePageData, usePageWords } from '../../../kit';
import { colors, radius, space, type } from '../../../theme/tokens';
import { communityInvite as page } from '../pages';
import { Gate, PillButton, useLoad } from '../ui';

// Invite Members (sample 10, screen 8). The invite code is shown only to someone who may manage the community (the server decides).
export default function Invite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = usePageWords(page);
  const { data, failed, reload } = useLoad(() => getInvite(String(id)), String(id));

  const share = () => {
    if (data?.invite_code) void Share.share({ message: w('shareMessage', { name: data.name, code: data.invite_code }) });
  };
  useAction(page, 'shareCode', share);
  usePageData(page, data ? { values: [{ label: w('inviteHeading', { name: data.name }), value: data.can_invite ? '' : w('managersOnly') }], images: [], lists: [], actions: [] } : null);

  return (
    <Gate title={w('inviteTitle')} data={data} failed={failed} reload={reload} notFound={w('notFound')} tryAgain={w('tryAgain')}>
      {(d) => (
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: space.md }}>
            <Ionicons name="person-add" size={44} color={colors.accent} />
          </View>
          <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '800', color: colors.ink, textAlign: 'center', marginTop: space.md }}>{w('inviteHeading', { name: d.name })}</Text>
          <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginTop: space.sm }]}>{w('inviteBody')}</Text>
          {d.can_invite && d.invite_code ? (
            <>
              <View style={{ alignSelf: 'stretch', backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, marginTop: space.lg, alignItems: 'center' }}>
                <Text style={[type.small, { color: colors.muted }]}>{w('inviteCode')}</Text>
                <Text selectable style={{ fontSize: 34, fontWeight: '800', letterSpacing: 4, color: colors.ink, marginTop: space.xs }}>{d.invite_code}</Text>
              </View>
              <El page={page} id="shareCode"><PillButton label={w('shareCode')} icon="share-outline" onPress={share} /></El>
            </>
          ) : (
            <Text style={[type.body, { color: colors.muted, textAlign: 'center', marginTop: space.lg }]}>{w('managersOnly')}</Text>
          )}
        </View>
      )}
    </Gate>
  );
}
