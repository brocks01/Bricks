import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, BackHandler, StyleSheet, View } from 'react-native';

import { useCreateEvent, useMe } from '@/api';
import type { EventCategory, EventSummary } from '@/api/types';
import {
  BigButton,
  Chip,
  ChipGroup,
  EventCard,
  Screen,
  StepProgress,
  Text,
  TextField,
} from '@/components';
import { CATEGORY_ICON } from '@/features/events/categories';
import { formatDay, formatTime, formatWhen } from '@/lib/format';
import { isWhatsAppGroupLink } from '@/lib/openExternal';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

const STEPS = ['what', 'day', 'time', 'where', 'link', 'preview'] as const;
type Step = (typeof STEPS)[number];
/** Questions counted in "Step x of y" (the preview isn't a question). */
const QUESTIONS = STEPS.length - 1;

const CATEGORIES: readonly EventCategory[] = [
  'walk',
  'exercise',
  'games',
  'music',
  'cooking',
  'gardening',
  'class',
  'meetup',
  'kids',
  'other',
];
const HOURS = [7, 8, 9, 10, 14, 16, 18, 19];
const PLACES = ['cc', 'park', 'voidDeck', 'hawker'] as const;
const DAYS_AHEAD = 7;
/** Don't offer a time that starts in less than this. */
const MIN_LEAD_MS = 30 * 60 * 1000;

function dayAt(offset: number, hour = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function hoursFor(dayOffset: number): number[] {
  const earliest = Date.now() + MIN_LEAD_MS;
  return HOURS.filter((h) => dayAt(dayOffset, h).getTime() > earliest);
}

/**
 * S17 Start Something (Airbnb one-question-per-screen + Luma create): what →
 * which day → what time → where → WhatsApp link (optional) → preview → Publish.
 * Every answer is a big tap; typing is only ever an extra option.
 */
export default function CreateEventScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const { data: me } = useMe();
  const create = useCreateEvent();

  const [step, setStep] = useState<Step>('what');
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [dayOffset, setDayOffset] = useState<number | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [placeKey, setPlaceKey] = useState<(typeof PLACES)[number] | null>(null);
  const [placeTyped, setPlaceTyped] = useState('');
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  const area = me?.area_name ?? '';
  const index = STEPS.indexOf(step);
  const days = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => i).filter((i) => hoursFor(i).length > 0),
    [],
  );

  const placeLabel = (key: (typeof PLACES)[number]) =>
    area ? t(`create.place.${key}`, { area }) : t(`create.placeGeneric.${key}`);
  const placeName = placeTyped.trim() || (placeKey ? placeLabel(placeKey) : '');
  const start = dayOffset !== null && hour !== null ? dayAt(dayOffset, hour) : null;
  const shownTitle = title.trim() || (category ? t(`category.${category}.title`) : '');

  const canContinue: Record<Step, boolean> = {
    what: category !== null,
    day: dayOffset !== null,
    time: hour !== null,
    where: placeName !== '',
    link: true,
    preview: shownTitle !== '' && start !== null && !create.isPending,
  };

  const goBack = useCallback(() => {
    if (index === 0) {
      if (router.canGoBack()) router.back();
      return;
    }
    setStep(STEPS[index - 1]!);
  }, [index, router]);

  // Android's back button walks back through the steps, like the Back link.
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

  const next = () => {
    if (step === 'link' && link.trim() && !isWhatsAppGroupLink(link)) {
      setLinkError(t('create.linkInvalid'));
      return;
    }
    if (step === 'preview') return publish();
    setStep(STEPS[index + 1]!);
  };

  const publish = () => {
    if (!category || !start) return;
    create.mutate(
      {
        title: shownTitle,
        category,
        start_at: start.toISOString(),
        end_at: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
        place_name: placeName,
        whatsapp_link: link.trim() || null,
      },
      {
        onSuccess: (event) => {
          router.back();
          router.push({ pathname: '/event/[id]', params: { id: event.id, published: '1' } });
        },
        onError: () => Alert.alert(t('common.error')),
      },
    );
  };

  const question: Record<Exclude<Step, 'preview'>, string> = {
    what: t('create.what'),
    day: t('create.day'),
    time: t('create.time'),
    where: t('create.where'),
    link: t('create.link'),
  };

  const preview: EventSummary | null =
    category && start
      ? {
          id: 'preview',
          title: shownTitle,
          category,
          start_at: start.toISOString(),
          end_at: null,
          place_name: placeName,
          photo_url: null,
          going_count: 1,
          my_rsvp: null,
          language,
          whatsapp_link: link.trim() || null,
          host: { id: me?.id ?? '', name: me?.name ?? '', photo_url: null },
        }
      : null;

  const readOut = () =>
    step === 'preview'
      ? t('create.readoutPreview', {
          title: shownTitle,
          when: start ? formatWhen(start, language, t) : '',
          place: placeName,
        })
      : t('create.readoutStep', { step: index + 1, total: QUESTIONS, question: question[step] });

  return (
    <Screen
      title={step === 'preview' ? t('create.preview') : t('create.title')}
      readOut={readOut}
      back
      onBack={goBack}
      testID="screen-create"
      footer={
        <BigButton
          label={step === 'preview' ? t('create.publish') : t('common.next')}
          disabled={!canContinue[step]}
          onPress={next}
          testID="create-next"
        />
      }
    >
      {step !== 'preview' ? <StepProgress step={index + 1} total={QUESTIONS} /> : null}

      {step === 'what' ? (
        <>
          <Text variant="heading">{question.what}</Text>
          <ChipGroup>
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                icon={CATEGORY_ICON[c]}
                label={t(`category.${c}.name`)}
                selected={category === c}
                onPress={() => setCategory(c)}
                testID={`create-category-${c}`}
              />
            ))}
          </ChipGroup>
        </>
      ) : null}

      {step === 'day' ? (
        <>
          <Text variant="heading">{question.day}</Text>
          <ChipGroup>
            {days.map((offset) => (
              <Chip
                key={offset}
                label={formatDay(dayAt(offset, 12), language, t)}
                selected={dayOffset === offset}
                onPress={() => {
                  setDayOffset(offset);
                  // A time chosen for another day may not exist on this one.
                  if (hour !== null && !hoursFor(offset).includes(hour)) setHour(null);
                }}
                testID={`create-day-${offset}`}
              />
            ))}
          </ChipGroup>
        </>
      ) : null}

      {step === 'time' && dayOffset !== null ? (
        <>
          <Text variant="heading">{question.time}</Text>
          <ChipGroup>
            {hoursFor(dayOffset).map((h) => (
              <Chip
                key={h}
                label={formatTime(dayAt(dayOffset, h), language)}
                selected={hour === h}
                onPress={() => setHour(h)}
                testID={`create-time-${h}`}
              />
            ))}
          </ChipGroup>
        </>
      ) : null}

      {step === 'where' ? (
        <>
          <Text variant="heading">{question.where}</Text>
          <ChipGroup>
            {PLACES.map((p) => (
              <Chip
                key={p}
                label={placeLabel(p)}
                selected={placeKey === p && !placeTyped.trim()}
                onPress={() => {
                  setPlaceKey(p);
                  setPlaceTyped('');
                }}
                testID={`create-place-${p}`}
              />
            ))}
          </ChipGroup>
          <TextField
            label={t('create.placeOther')}
            value={placeTyped}
            onChangeText={setPlaceTyped}
            returnKeyType="done"
            testID="create-place-typed"
          />
        </>
      ) : null}

      {step === 'link' ? (
        <>
          <Text variant="heading">{question.link}</Text>
          <TextField
            label={t('create.linkLabel')}
            hint={t('create.linkHint')}
            value={link}
            onChangeText={(v) => {
              setLink(v);
              setLinkError(null);
            }}
            error={linkError}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            testID="create-link"
          />
          <BigButton
            variant="outline"
            label={t('create.linkSkip')}
            onPress={() => {
              setLink('');
              setLinkError(null);
              setStep('preview');
            }}
            testID="create-link-skip"
          />
        </>
      ) : null}

      {step === 'preview' && preview ? (
        <>
          <TextField
            label={t('create.nameLabel')}
            value={title || shownTitle}
            onChangeText={setTitle}
            testID="create-title"
          />
          <Text color="textSecondary">{t('create.previewHint')}</Text>
          {/* Exactly the card others will see; not tappable here. */}
          <View pointerEvents="none" style={styles.preview}>
            <EventCard event={preview} onOpen={() => {}} onGoing={() => {}} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    marginTop: space.xs,
  },
});
