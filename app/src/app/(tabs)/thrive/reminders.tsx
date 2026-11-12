import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useCompleteReminder, useCreateReminder, useDeleteReminder, useReminders } from '@/api';
import type { Reminder } from '@/api/types';
import {
  BellIcon,
  BigButton,
  ButtonRow,
  CheckCircleIcon,
  EmptyState,
  GroupedList,
  MicrophoneIcon,
  PlusIcon,
  QueryState,
  Screen,
  StatusBanner,
  Text,
  TrashIcon,
} from '@/components';
import { REMINDER_ICON, timeToday } from '@/features/reminders/kinds';
import { formatTime } from '@/lib/format';
import { notificationsAllowed } from '@/lib/notifications';
import { platform } from '@/lib/platform';
import { useBuddy } from '@/state/buddy';
import { useUndo } from '@/state/undo';
import { categoryColor, color, iconSize, radius, space, type CategoryColorKey } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/**
 * S26 Reminders (Monzo list): each reminder on its own card with its time in
 * large type, how often, and two clear buttons: Done (for today) and Remove
 * (with Undo). No swipe-to-delete. "Add a reminder" is fixed at the bottom.
 */
export default function RemindersScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const openBuddy = useBuddy((s) => s.open);
  // Opened from a reminder notification: read it out straight away (S38).
  const { read } = useLocalSearchParams<{ read?: string }>();
  const query = useReminders();
  const complete = useCompleteReminder();
  const remove = useDeleteReminder();
  const restore = useCreateReminder();
  const showUndo = useUndo((s) => s.show);

  // Tell them plainly if the phone won't actually sound the alerts.
  const [alertsOff, setAlertsOff] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (platform.canScheduleNotifications) {
        void notificationsAllowed(false).then((ok) => active && setAlertsOff(!ok));
      }
      return () => {
        active = false;
      };
    }, []),
  );

  const time = (r: Reminder) => formatTime(timeToday(r.time), language);

  const onRemove = (r: Reminder) => {
    remove.mutate(r);
    showUndo(t('reminders.removed'), () =>
      restore.mutate({ kind: r.kind, text: r.text, time: r.time, repeat: r.repeat, date: r.date }),
    );
  };

  const readOut = () => {
    const list = query.data ?? [];
    return t('reminders.readout', {
      list:
        list.length === 0
          ? t('reminders.readoutNone')
          : list
              .map((r) =>
                t('reminders.readoutItem', {
                  time: time(r),
                  text: r.text,
                  repeat: t(`reminders.repeat.${r.repeat}`),
                }),
              )
              .join(' '),
    });
  };

  return (
    <Screen
      section="health"
      title={t('reminders.title')}
      readOut={readOut}
      readOnOpen={read === '1'}
      testID="screen-reminders"
      footer={
        <>
          {/* By voice: Buddy asks before it sets anything ("Every day at 8 am… Is that right?"). */}
          <BigButton
            variant="outline"
            icon={MicrophoneIcon}
            label={t('reminders.sayIt')}
            onPress={openBuddy}
            testID="reminders-say-it"
          />
          <BigButton
            icon={PlusIcon}
            label={t('reminders.add')}
            onPress={() => router.push('/thrive/reminder-new')}
            testID="reminders-add"
          />
        </>
      }
    >
      {alertsOff ? <StatusBanner tone="notice" text={t('reminders.notifyOff')} /> : null}
      <QueryState query={query}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState
              icon={BellIcon}
              text={t('reminders.empty')}
              actionLabel={t('reminders.add')}
              onAction={() => router.push('/thrive/reminder-new')}
            />
          ) : (
            <GroupedList inset={false}>
              {list.map((r) => {
                const KindIcon = REMINDER_ICON[r.kind];
                return (
                  <View key={r.id} style={styles.row} testID={`reminder-${r.id}`}>
                    <View style={styles.header}>
                      <View
                        style={[
                          styles.kind,
                          { backgroundColor: categoryColor[KIND_TINT[r.kind]].fg },
                        ]}
                      >
                        <KindIcon size={iconSize.inline} color={color.textOnColor} weight="fill" />
                      </View>
                      <Text variant="title" style={styles.flex}>
                        {time(r)}
                      </Text>
                    </View>
                    <Text variant="heading" weight="regular">
                      {r.text}
                    </Text>
                    <Text color="textSecondary">{t(`reminders.repeat.${r.repeat}`)}</Text>
                    {r.created_by === 'family' ? (
                      <Text color="textSecondary">{t('reminders.byFamily')}</Text>
                    ) : null}
                    {r.done_today ? (
                      <View style={styles.done}>
                        <CheckCircleIcon
                          size={iconSize.inline}
                          color={color.success}
                          weight="fill"
                        />
                        <Text variant="bodyStrong" color="success">
                          {t('reminders.doneToday')}
                        </Text>
                      </View>
                    ) : null}
                    <ButtonRow>
                      {r.done_today ? null : (
                        <BigButton
                          variant="success"
                          label={t('common.done')}
                          onPress={() => complete.mutate(r.id)}
                          testID={`reminder-${r.id}-done`}
                        />
                      )}
                      <BigButton
                        variant="outline"
                        icon={TrashIcon}
                        label={t('reminders.remove')}
                        onPress={() => onRemove(r)}
                        testID={`reminder-${r.id}-remove`}
                      />
                    </ButtonRow>
                  </View>
                );
              })}
            </GroupedList>
          )
        }
      </QueryState>
    </Screen>
  );
}

/** The coloured square behind each kind's icon. */
const KIND_TINT: Record<Reminder['kind'], CategoryColorKey> = {
  medicine: 'music',
  doctor: 'exercise',
  event: 'walk',
  other: 'other',
};

const KIND_TILE = 44;

const styles = StyleSheet.create({
  row: {
    gap: space.xs,
    padding: space.sm,
  },
  kind: {
    width: KIND_TILE,
    height: KIND_TILE,
    borderRadius: radius.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
});
