import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAcceptFamilyInvite, useFamilyInvites, useSetSeniorSimpleMode } from '@/api';
import {
  BellIcon,
  BigButton,
  ButtonRow,
  FirstAidKitIcon,
  MicrophoneIcon,
  Card,
  EmptyState,
  HouseIcon,
  QueryState,
  Screen,
  ShieldCheckIcon,
  SquaresFourIcon,
  showToast,
  StatusBanner,
  Text,
  UserPlusIcon,
  UsersThreeIcon,
  InfoRow,
} from '@/components';
import { ParentOverview } from '@/features/family/ParentOverview';
import { useRelationName } from '@/features/family/relationName';
import { config } from '@/lib/config';
import { borderWidth, color, radius, space } from '@/theme';

/**
 * S10 Family view (LifeSG status): for each parent, "Waiting for Dad to say yes"
 * until they accept on WhatsApp or SMS, then "Dad joined". Once they've joined,
 * family can set a reminder for them or turn on Simple Mode (S13) for them.
 */
export default function FamilyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const invites = useFamilyInvites();
  const accept = useAcceptFamilyInvite();
  const simpleMode = useSetSeniorSimpleMode();
  const relationName = useRelationName();

  const readOut = () => {
    const list = invites.data ?? [];
    if (list.length === 0) return `${t('family.title')}. ${t('family.empty')}`;
    return `${t('family.title')}. ${list
      .map((i) =>
        i.status === 'accepted'
          ? t('family.joined', { name: relationName(i) })
          : t('family.waiting', { name: relationName(i) }),
      )
      .join('. ')}.`;
  };

  return (
    <Screen section="settings" title={t('family.title')} readOut={readOut} testID="screen-family">
      <QueryState query={invites}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState
              icon={UsersThreeIcon}
              text={t('family.empty')}
              detail={t('family.emptyDetail')}
            />
          ) : (
            <View style={styles.list}>
              {list.map((invite) => {
                const who = relationName(invite);
                const joined = invite.status === 'accepted';
                return (
                  <Card key={invite.id} testID={`family-invite-${invite.id}`}>
                    <Text variant="heading">{invite.senior_name}</Text>
                    <StatusBanner
                      tone={joined ? 'success' : 'info'}
                      text={
                        joined
                          ? t('family.joined', { name: who })
                          : t('family.waiting', { name: who })
                      }
                      testID={`family-status-${invite.id}`}
                    />
                    {!joined ? <Text>{t('family.waitingHint', { name: who })}</Text> : null}
                    {invite.add_me_to_safe_circle ? (
                      <InfoRow
                        icon={ShieldCheckIcon}
                        text={t('family.inSafeCircle', { name: who })}
                      />
                    ) : null}
                    {joined && invite.senior_id ? (
                      <ParentOverview seniorId={invite.senior_id} name={who} />
                    ) : null}
                    {joined && invite.senior_id ? (
                      <ButtonRow>
                        <BigButton
                          variant="outline"
                          icon={FirstAidKitIcon}
                          label={t('family.healthCard')}
                          onPress={() =>
                            router.push({
                              pathname: '/health-card',
                              params: { senior: invite.senior_id!, name: who },
                            })
                          }
                          testID={`family-health-card-${invite.id}`}
                        />
                        <BigButton
                          variant="outline"
                          icon={MicrophoneIcon}
                          label={t('family.stories')}
                          onPress={() =>
                            router.push({
                              pathname: '/stories',
                              params: { senior: invite.senior_id!, name: who },
                            })
                          }
                          testID={`family-stories-${invite.id}`}
                        />
                      </ButtonRow>
                    ) : null}
                    {joined && invite.senior_id ? (
                      <BigButton
                        icon={BellIcon}
                        label={t('family.setReminder', { name: who })}
                        onPress={() =>
                          router.push({
                            pathname: '/thrive/reminder-new',
                            params: { for: invite.senior_id!, forName: who },
                          })
                        }
                        testID={`family-reminder-${invite.id}`}
                      />
                    ) : null}
                    {joined && invite.senior_id ? (
                      <>
                        <BigButton
                          variant="outline"
                          icon={SquaresFourIcon}
                          label={t(
                            invite.simple_mode ? 'family.simpleModeOff' : 'family.simpleModeOn',
                            { name: who },
                          )}
                          disabled={simpleMode.isPending}
                          onPress={() =>
                            simpleMode.mutate(
                              { seniorId: invite.senior_id!, on: !invite.simple_mode },
                              {
                                onSuccess: () =>
                                  showToast(
                                    t(
                                      invite.simple_mode
                                        ? 'family.simpleModeTurnedOff'
                                        : 'family.simpleModeTurnedOn',
                                      { name: who },
                                    ),
                                  ),
                              },
                            )
                          }
                          testID={`family-simple-${invite.id}`}
                        />
                        <Text color="textSecondary">
                          {t('family.simpleModeHint', { name: who })}
                        </Text>
                      </>
                    ) : null}
                    {config.demoVoice && !joined ? (
                      // Facilitator control on mock data: the parent's "Yes" happens on WhatsApp or SMS.
                      <View style={styles.demo}>
                        <Text color="textSecondary">{t('family.demoHint')}</Text>
                        <BigButton
                          variant="outline"
                          label={t('family.demoAccept', { name: who })}
                          disabled={accept.isPending}
                          onPress={() => accept.mutate(invite.id)}
                          testID={`family-demo-accept-${invite.id}`}
                        />
                      </View>
                    ) : null}
                  </Card>
                );
              })}
            </View>
          )
        }
      </QueryState>

      <BigButton
        variant="outline"
        icon={UserPlusIcon}
        label={t('family.addAnother')}
        onPress={() => router.push('/onboarding/family')}
        testID="family-add"
      />
      <BigButton
        variant="outline"
        icon={HouseIcon}
        label={t('onboarding.done.goHome')}
        onPress={() => router.navigate('/home')}
        testID="family-home"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
  demo: {
    gap: space.xs,
    padding: space.sm,
    borderRadius: radius.card,
    borderWidth: borderWidth.control,
    borderStyle: 'dashed',
    borderColor: color.borderStrong,
  },
});
