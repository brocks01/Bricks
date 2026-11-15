import { Text, View } from 'react-native';
import { Avatar } from '../../../../components/headers';
import { Button, Row, Screen } from '../../../../components/ui';
import { useStore } from '../../../../core/store';
import { LANGUAGES, useLanguage, useT } from '../../../../i18n';
import { El, useAction, usePageWords } from '../../../../kit';
import { useNavigate } from '../../../../navigation';
import { sessionStore, signOut } from '../../../../session/store';
import { colors, space } from '../../../../theme/tokens';
import '../../moreWords'; // registers the words of the More list
import { meIndex as page } from './page';

// Me = the person's own details, language, and sign out. Everything shown comes from their account.
export default function Me() {
  const w = usePageWords(page);
  const t = useT();
  const go = useNavigate();
  const code = useLanguage();
  const { user: own, actingUser } = useStore(sessionStore);
  const user = actingUser ?? own; // while helping a family member, their details are shown
  const current = LANGUAGES.find((l) => l.code === code);
  const notSet = t('common.notSet');
  useAction(page, 'editProfile', () => go('me.edit'));
  useAction(page, 'chooseLanguage', () => go('language.pick'));
  useAction(page, 'signOut', signOut);

  return (
    <Screen title={w('heading')} subtitle={t('common.onlyYou')} back>
      <View style={{ alignItems: 'center', paddingVertical: space.lg }}>
        <Avatar name={user?.display_name ?? user?.email ?? ''} size={84} dot />
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.ink, marginTop: space.md }}>{user?.display_name}</Text>
      </View>

      <El page={page} id="email"><Row icon="mail-outline" label={w('email')} value={user?.email ?? notSet} /></El>
      <El page={page} id="phone"><Row icon="call-outline" label={w('phone')} value={user?.phone ?? notSet} /></El>
      <El page={page} id="ageBand"><Row icon="people-outline" label={w('ageBand')} value={user?.age_band ? t(`common.ageBand.${user.age_band}`) : notSet} /></El>
      <El page={page} id="area"><Row icon="location-outline" label={w('area')} value={user?.area_name ?? notSet} /></El>
      <El page={page} id="editProfile"><Row icon="create-outline" label="" value={w('editProfile')} onPress={() => go('me.edit')} /></El>
      <El page={page} id="chooseLanguage"><Row icon="language" label={w('language')} value={current?.native ?? ''} onPress={() => go('language.pick')} /></El>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.ink, marginTop: space.lg, marginBottom: space.sm }} accessibilityRole="header">{t('menu.more')}</Text>
      <Row icon="heart-outline" label="" value={t('health.index.heading')} onPress={() => go('health.index')} />
      <Row icon="people-circle-outline" label="" value={t('menu.family')} onPress={() => go('family.home')} />
      <Row icon="calendar-outline" label="" value={t('menu.calendar')} onPress={() => go('calendar.today')} />
      <Row icon="sparkles-outline" label="" value={t('menu.aspirations')} onPress={() => go('grow.aspirations')} />
      <Row icon="trending-up-outline" label="" value={t('menu.progress')} onPress={() => go('grow.progress')} />
      <Row icon="hand-left-outline" label="" value={t('menu.contributions')} onPress={() => go('grow.contributions')} />
      <Row icon="fitness-outline" label="" value={t('menu.activity')} onPress={() => go('grow.activity')} />
      <Row icon="compass-outline" label="" value={t('menu.library')} onPress={() => go('explore.home')} />
      {__DEV__ ? <Row icon="code-slash" label="" value="Agent test console (developer)" onPress={() => go('dev.console')} /> : null}
      <View style={{ height: space.md }} />
      <El page={page} id="signOut"><Button kind="danger" icon="log-out-outline" label={w('signOut')} onPress={() => void signOut()} /></El>
    </Screen>
  );
}
