import { useQueryClient } from '@tanstack/react-query';
import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { api } from '@/api/client';
import { queryKeys, useAnswerCheckin, useCreateReminder, useDeleteReminder } from '@/api/queries';
import type { EventSummary, NewReminder } from '@/api/types';
import { BigButton } from '@/components/BigButton';
import { BottomSheet } from '@/components/BottomSheet';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { MicrophoneIcon, SpeakerHighIcon, XIcon } from '@/components/primitives/icons';
import { Text } from '@/components/primitives/Text';
import { useJoinEvent } from '@/features/events/useJoinEvent';
import { useReadOut } from '@/features/readout/ReadOutProvider';
import { atMinutes, hhmm, reminderDate } from '@/features/reminders/kinds';
import { VoiceInputSheet } from '@/features/voice/VoiceInputSheet';
import { useActiveWalk } from '@/features/walk/activeWalk';
import { useActiveLanguage } from '@/i18n/useActiveLanguage';
import { formatTime, formatWhen } from '@/lib/format';
import { useBuddy } from '@/state/buddy';
import { useUndo } from '@/state/undo';
import { borderWidth, color, radius, space } from '@/theme';

import { BUDDY_DEMO_PHRASES } from './demoPhrases';
import { matchIntent, type NavTarget } from './intents';

type Stage =
  | { kind: 'idle' }
  | { kind: 'reply'; text: string; canRetry: boolean }
  | { kind: 'confirm'; text: string; onYes: () => Promise<void> | void };

/**
 * Buddy, the voice helper (S36), on mock data: Tell me → listen → work out what
 * they want → answer in a large bubble (and out loud) → ask before changing
 * anything → do it, with Undo → show it on screen.
 *
 * "Help" in any language opens the SOS screen straight away, with no question.
 * Reading things and going places never asks first; changes always do.
 */
export function BuddyHost() {
  const { t } = useTranslation();
  const language = useActiveLanguage();
  const router = useRouter();
  const client = useQueryClient();
  const { speak, stop: stopSpeaking } = useReadOut();
  const listening = useBuddy((s) => s.listening);
  const closeListening = useBuddy((s) => s.close);
  const openListening = useBuddy((s) => s.open);
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });

  const answerCheckin = useAnswerCheckin({ quiet: true });
  const createReminder = useCreateReminder();
  const deleteReminder = useDeleteReminder();
  const joinEvent = useJoinEvent();
  const showUndo = useUndo((s) => s.show);

  // Buddy's voice isn't stopped by the screens it opens (they only stop their own reading).
  const say = (text: string) => speak(text, BUDDY);
  const reply = (text: string, canRetry = false) => {
    setStage({ kind: 'reply', text, canRetry });
    say(text);
  };
  const confirm = (text: string, onYes: () => Promise<void> | void) => {
    setStage({ kind: 'confirm', text, onYes });
    say(text);
  };
  const done = () => {
    stopSpeaking();
    setStage({ kind: 'idle' });
  };

  const today = () => client.fetchQuery({ queryKey: queryKeys.today, queryFn: api.getToday });
  const when = (e: Pick<EventSummary, 'start_at'>) => formatWhen(new Date(e.start_at), language, t);

  async function handle(said: string) {
    closeListening();
    const intent = matchIntent(said, language);

    switch (intent.kind) {
      case 'help':
        // Never ask: get help on screen at once.
        setStage({ kind: 'idle' });
        router.push('/sos');
        return;

      case 'today': {
        const d = await today().catch(() => null);
        if (!d) return reply(t('common.error'));
        router.navigate('/home');
        const parts = [
          d.checkin.pending ? t('buddy.todayCheckin') : '',
          d.next_event
            ? t('buddy.todayEvent', { title: d.next_event.title, when: when(d.next_event) })
            : '',
          d.next_reminder
            ? t('buddy.todayReminder', {
                time: formatTime(atMinutes(toMinutes(d.next_reminder.time)), language),
                text: d.next_reminder.text,
              })
            : '',
        ].filter(Boolean);
        return reply(parts.length ? parts.join(' ') : t('buddy.todayNothing'));
      }

      case 'join': {
        const d = await today().catch(() => null);
        const event = d?.next_event;
        if (!event) return reply(t('buddy.nothingToJoin'));
        if (event.my_rsvp === 'going') {
          return reply(t('buddy.alreadyGoing', { title: event.title, when: when(event) }));
        }
        return confirm(t('buddy.joinConfirm', { title: event.title, when: when(event) }), () => {
          done();
          joinEvent(event);
        });
      }

      case 'checkin': {
        const d = await today().catch(() => null);
        if (d && !d.checkin.pending) {
          router.navigate('/thrive/checkin');
          return reply(t('checkin.alreadyAnswered'));
        }
        return confirm(t(`buddy.checkinConfirm.${intent.answer}`), async () => {
          done();
          try {
            const result = await answerCheckin.mutateAsync(intent.answer);
            router.navigate('/thrive/checkin');
            if (result.answer === 'yes') say(t('home.checkin.thanks', { count: result.streak }));
          } catch {
            reply(t('common.error'));
          }
        });
      }

      case 'remind': {
        const r = intent.reminder;
        if (r.minutes === null) {
          router.navigate('/thrive/reminder-new');
          return reply(t('buddy.remindNoTime'));
        }
        const minutes = r.minutes;
        const time = formatTime(atMinutes(minutes), language);
        const text = t(`reminders.new.defaultText.${r.kind}`);
        const input: NewReminder = {
          kind: r.kind,
          text,
          time: hhmm(minutes),
          repeat: r.repeat,
          date: r.repeat === 'once' ? reminderDate(minutes, r.dayOffset) : null,
        };
        const summary = t('reminders.new.summary', {
          repeat:
            r.repeat === 'once' && r.dayOffset === 1
              ? t('time.tomorrow')
              : t(`reminders.repeat.${r.repeat}`),
          time,
          text,
        });
        return confirm(t('buddy.confirmQuestion', { summary }), async () => {
          done();
          try {
            const reminder = await createReminder.mutateAsync(input);
            router.navigate('/thrive/reminders');
            showUndo(t('reminders.added', { time }), () => deleteReminder.mutate(reminder));
            say(t('reminders.added', { time }));
          } catch {
            reply(t('common.error'));
          }
        });
      }

      case 'start_walk':
        router.navigate('/walk/record');
        return reply(
          useActiveWalk.getState().session ? t('buddy.walkContinues') : t('buddy.walkStarted'),
        );

      case 'stop_walk':
        if (!useActiveWalk.getState().session) return reply(t('buddy.noWalk'));
        setStage({ kind: 'idle' });
        useActiveWalk.getState().askToFinish();
        router.navigate('/walk/record');
        return;

      case 'profile':
        router.navigate('/profile');
        return reply(t('buddy.profile'));

      case 'navigate': {
        // Going places never asks first: open it and say where we are.
        setStage({ kind: 'idle' });
        const place = NAV_ROUTES[intent.to];
        router.navigate(place.href);
        say(t('buddy.opening', { place: t(place.name) }));
        return;
      }

      case 'back':
        setStage({ kind: 'idle' });
        if (router.canGoBack()) router.back();
        else reply(t('buddy.cantGoBack'));
        return;

      default:
        return reply(t('buddy.unknown'), true);
    }
  }

  return (
    <>
      <VoiceInputSheet
        visible={listening}
        demoPhrases={BUDDY_DEMO_PHRASES[language]}
        onResult={(said) => void handle(said)}
        onClose={closeListening}
      />

      <BottomSheet visible={stage.kind === 'reply'} onRequestClose={done} testID="buddy-reply">
        {stage.kind === 'reply' ? (
          <>
            <View style={styles.bubble} accessibilityLiveRegion="polite">
              <Text variant="heading" weight="regular" testID="buddy-reply-text">
                {stage.text}
              </Text>
            </View>
            <BigButton
              variant="outline"
              icon={SpeakerHighIcon}
              label={t('buddy.playAgain')}
              onPress={() => say(stage.text)}
              testID="buddy-play-again"
            />
            {stage.canRetry ? (
              <BigButton
                icon={MicrophoneIcon}
                label={t('common.tryAgain')}
                onPress={() => {
                  done();
                  openListening();
                }}
                testID="buddy-retry"
              />
            ) : null}
            <BigButton
              variant={stage.canRetry ? 'outline' : 'primary'}
              icon={XIcon}
              label={t('common.close')}
              onPress={done}
              testID="buddy-close"
            />
          </>
        ) : null}
      </BottomSheet>

      <ConfirmSheet
        visible={stage.kind === 'confirm'}
        text={stage.kind === 'confirm' ? stage.text : ''}
        onYes={() => {
          if (stage.kind === 'confirm') void stage.onYes();
        }}
        onNo={() => {
          done();
          say(t('buddy.cancelled'));
        }}
      />
    </>
  );
}

const BUDDY = 'buddy';

/** Where each screen Buddy can open lives, and the name it's read out by. */
const NAV_ROUTES = {
  home: { href: '/home', name: 'tabs.home' },
  kampung: { href: '/kampung', name: 'tabs.kampung' },
  circles: { href: '/kampung/circles', name: 'circles.title' },
  create: { href: '/kampung/create', name: 'create.title' },
  passItOn: { href: '/pass-it-on', name: 'tabs.passItOn' },
  thrive: { href: '/thrive', name: 'tabs.thrive' },
  checkin: { href: '/thrive/checkin', name: 'checkin.title' },
  reminders: { href: '/thrive/reminders', name: 'reminders.title' },
  settings: { href: '/settings', name: 'settings.title' },
  language: { href: '/settings/language', name: 'settings.language' },
  safeCircle: { href: '/settings/safe-circle', name: 'settings.safeCircle' },
  family: { href: '/family', name: 'family.title' },
} as const satisfies Record<NavTarget, { href: Href; name: string }>;

/** "08:30" → 510. */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

const styles = StyleSheet.create({
  // A large chat bubble (WhatsApp), never a chatbot window.
  bubble: {
    padding: space.md,
    borderRadius: radius.card,
    borderBottomLeftRadius: space.xxs,
    borderWidth: borderWidth.hairline,
    borderColor: color.border,
    backgroundColor: color.primarySubtle,
  },
});
