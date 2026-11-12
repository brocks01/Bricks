import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, BackHandler } from 'react-native';

import { useCreateReminder, useDeleteReminder } from '@/api';
import type { ReminderKind, ReminderRepeat } from '@/api/types';
import {
  BigButton,
  Card,
  Chip,
  ChipGroup,
  ClockIcon,
  Screen,
  StatusBanner,
  StepProgress,
  Text,
  TextField,
  TimeAdjuster,
} from '@/components';
import { hhmm, REMINDER_ICON, REMINDER_KINDS, reminderDate } from '@/features/reminders/kinds';
import { formatTime } from '@/lib/format';
import { notificationsAllowed } from '@/lib/notifications';
import { useUndo } from '@/state/undo';
import { useTypography } from '@/theme/TypographyProvider';

const STEPS = ['what', 'when', 'repeat', 'review'] as const;
type Step = (typeof STEPS)[number];
const QUESTIONS = STEPS.length - 1;
/** Common reminder times, as big buttons (minutes after midnight). */
const COMMON_TIMES = [7, 8, 9, 12, 14, 18, 20, 21].map((h) => h * 60);
const REPEATS: readonly ReminderRepeat[] = ['daily', 'weekdays', 'once'];

/**
 * Add a reminder (S26 form): What is it for? → What time? (common times, or
 * "Another time" with big Earlier / Later buttons, no spinning wheels) →
 * How often? → check the wording and Save. Asks to send alerts only on Save.
 */
export default function NewReminderScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const create = useCreateReminder();
  const remove = useDeleteReminder();
  const showUndo = useUndo((s) => s.show);
  // Family setting a reminder for their parent (from S10): "for" is the parent's id.
  const params = useLocalSearchParams<{ for?: string; forName?: string }>();
  const forSenior = params.for ?? null;

  const [step, setStep] = useState<Step>('what');
  const [kind, setKind] = useState<ReminderKind | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [customTime, setCustomTime] = useState(false);
  const [repeat, setRepeat] = useState<ReminderRepeat | null>(null);
  const [text, setText] = useState('');
  const index = STEPS.indexOf(step);

  const shownText = text.trim() || (kind ? t(`reminders.new.defaultText.${kind}`) : '');
  const shownTime =
    minutes !== null
      ? formatTime(new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60), language)
      : '';

  const canContinue: Record<Step, boolean> = {
    what: kind !== null,
    when: minutes !== null,
    repeat: repeat !== null,
    review: shownText !== '' && !create.isPending,
  };

  const goBack = useCallback(() => {
    if (index === 0) {
      if (router.canGoBack()) router.back();
      return;
    }
    setStep(STEPS[index - 1]!);
  }, [index, router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (index === 0) return false;
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [index, goBack]),
  );

  const save = async () => {
    if (!kind || minutes === null || !repeat) return;
    // The phone's permission prompt appears here, right after they chose to set a reminder.
    await notificationsAllowed(true).catch(() => false);
    try {
      const reminder = await create.mutateAsync({
        kind,
        text: shownText,
        time: hhmm(minutes),
        repeat,
        date: repeat === 'once' ? reminderDate(minutes) : null,
        for_senior_id: forSenior,
      });
      showUndo(t('reminders.added', { time: shownTime }), () => remove.mutate(reminder));
      if (router.canGoBack()) router.back();
    } catch {
      Alert.alert(t('common.error'));
    }
  };

  const next = () => {
    if (step === 'review') return void save();
    setStep(STEPS[index + 1]!);
  };

  const question: Record<Exclude<Step, 'review'>, string> = {
    what: t('reminders.new.what'),
    when: t('reminders.new.when'),
    repeat: t('reminders.new.repeatTitle'),
  };
  const summary = repeat
    ? t('reminders.new.summary', {
        repeat: t(`reminders.repeat.${repeat}`),
        time: shownTime,
        text: shownText,
      })
    : '';

  return (
    <Screen
      section="health"
      title={t('reminders.new.title')}
      readOut={() =>
        step === 'review'
          ? summary
          : t('reminders.new.readoutStep', {
              step: index + 1,
              total: QUESTIONS,
              question: question[step],
            })
      }
      back
      onBack={goBack}
      testID="screen-reminder-new"
      footer={
        <BigButton
          label={step === 'review' ? t('reminders.new.save') : t('common.next')}
          disabled={!canContinue[step]}
          onPress={next}
          testID="reminder-next"
        />
      }
    >
      {forSenior && params.forName ? (
        <StatusBanner text={t('reminders.new.forSomeone', { name: params.forName })} />
      ) : null}
      {step !== 'review' ? <StepProgress step={index + 1} total={QUESTIONS} /> : null}

      {step === 'what' ? (
        <>
          <Text variant="heading">{question.what}</Text>
          <ChipGroup>
            {REMINDER_KINDS.map((k) => (
              <Chip
                key={k}
                icon={REMINDER_ICON[k]}
                label={t(`reminders.new.kind.${k}`)}
                selected={kind === k}
                onPress={() => setKind(k)}
                testID={`reminder-kind-${k}`}
              />
            ))}
          </ChipGroup>
        </>
      ) : null}

      {step === 'when' ? (
        <>
          <Text variant="heading">{question.when}</Text>
          <ChipGroup>
            {COMMON_TIMES.map((m) => (
              <Chip
                key={m}
                label={formatTime(new Date(2026, 0, 1, Math.floor(m / 60), 0), language)}
                selected={!customTime && minutes === m}
                onPress={() => {
                  setCustomTime(false);
                  setMinutes(m);
                }}
                testID={`reminder-time-${m / 60}`}
              />
            ))}
            <Chip
              icon={ClockIcon}
              label={t('reminders.new.anotherTime')}
              selected={customTime}
              onPress={() => {
                setCustomTime(true);
                setMinutes((m) => m ?? 8 * 60);
              }}
              testID="reminder-time-other"
            />
          </ChipGroup>
          {customTime && minutes !== null ? (
            <TimeAdjuster minutes={minutes} onChange={setMinutes} language={language} />
          ) : null}
        </>
      ) : null}

      {step === 'repeat' ? (
        <>
          <Text variant="heading">{question.repeat}</Text>
          <ChipGroup>
            {REPEATS.map((r) => (
              <Chip
                key={r}
                label={t(`reminders.repeat.${r}`)}
                selected={repeat === r}
                onPress={() => setRepeat(r)}
                testID={`reminder-repeat-${r}`}
              />
            ))}
          </ChipGroup>
        </>
      ) : null}

      {step === 'review' ? (
        <>
          <Card tone="subtle">
            <Text variant="heading" testID="reminder-summary">
              {summary}
            </Text>
          </Card>
          <TextField
            label={t('reminders.new.textLabel')}
            value={text || shownText}
            onChangeText={setText}
            testID="reminder-text"
          />
          {create.isError ? <StatusBanner tone="notice" text={t('common.error')} /> : null}
        </>
      ) : null}
    </Screen>
  );
}
