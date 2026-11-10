import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useEvent } from '@/api';
import {
  BigButton,
  CheckCircleIcon,
  QueryState,
  Screen,
  Text,
  WhatsappLogoIcon,
} from '@/components';
import { rsvpUndoKey } from '@/features/events/useJoinEvent';
import { formatTime, formatWhen } from '@/lib/format';
import { openExternal } from '@/lib/openExternal';
import { useUndo } from '@/state/undo';
import { color, iconSize, space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

const REMIND_BEFORE_MS = 60 * 60 * 1000;

/**
 * S16 You're going (Monzo-style calm confirmation): a tick, one sentence, when
 * we'll remind them, the WhatsApp group, and Done. Undo stays available for 8 s
 * in the bar at the bottom; if they undo, this screen closes by itself.
 */
export default function GoingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const query = useEvent(id);
  const event = query.data;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  // Undo of this join closes the screen (only undos made after it opened count).
  const lastUndone = useUndo((s) => s.lastUndone);
  const [openedAt] = useState(() => useUndo.getState().lastUndone?.seq ?? 0);
  const closeAfterUndo = useEffectEvent(close);
  useEffect(() => {
    if (lastUndone && lastUndone.seq > openedAt && lastUndone.key === rsvpUndoKey(id)) {
      closeAfterUndo();
    }
  }, [lastUndone, openedAt, id]);

  const start = event ? new Date(event.start_at) : null;
  const when = start ? formatWhen(start, language, t) : '';
  const remindAt = start ? formatTime(new Date(start.getTime() - REMIND_BEFORE_MS), language) : '';

  return (
    <Screen
      back={false}
      readOut={() =>
        event ? t('going.readout', { title: event.title, when, time: remindAt }) : t('going.title')
      }
      testID="screen-going"
      standalone
      footer={
        event ? (
          <>
            {event.whatsapp_link ? (
              <BigButton
                icon={WhatsappLogoIcon}
                label={t('event.joinWhatsApp')}
                onPress={() => void openExternal(event.whatsapp_link!)}
                testID="going-whatsapp"
              />
            ) : null}
            <BigButton
              variant={event.whatsapp_link ? 'outline' : 'primary'}
              label={t('common.done')}
              onPress={close}
              testID="going-done"
            />
          </>
        ) : null
      }
    >
      <QueryState query={query} notFoundText={t('eventDetail.notFound')}>
        {(e) => (
          <View style={styles.body}>
            <CheckCircleIcon size={iconSize.celebrate} color={color.success} weight="fill" />
            <Text variant="display" align="center" accessibilityRole="header">
              {t('going.title')}
            </Text>
            <View style={styles.summary}>
              <Text variant="heading" align="center">
                {e.title}
              </Text>
              <Text align="center">{when}</Text>
              <Text align="center">{e.place_name}</Text>
            </View>
            <Text align="center" color="textSecondary">
              {t('going.remind', { time: remindAt })}
            </Text>
            {e.whatsapp_link ? (
              <Text align="center" color="textSecondary">
                {t('going.whatsappHint')}
              </Text>
            ) : null}
          </View>
        )}
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    gap: space.md,
    paddingTop: space.xl,
  },
  summary: {
    alignItems: 'center',
    gap: space.xxs,
  },
});
