import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, BackHandler, StyleSheet, View } from 'react-native';

import { useCreateEvent, useMe } from '@/api';
import type { EventCategory, EventSummary } from '@/api/types';
import {
  BigButton,
  CalendarBlankIcon,
  Chip,
  ChipGroup,
  ClockIcon,
  CoverArt,
  DayAdjuster,
  GroupedList,
  GroupedRow,
  TimeAdjuster,
  MapPinIcon,
  Screen,
  StatusBanner,
  StepProgress,
  EventCard,
  WhatsappLogoIcon,
  Text,
  TextField,
} from '@/components';
import { CATEGORY_ICON } from '@/features/events/categories';
import { formatDay, formatTime, formatWhen } from '@/lib/format';
import { isWhatsAppGroupLink } from '@/lib/openExternal';
import { borderWidth, color, radius, shadow, space } from '@/theme';
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
/** "Another day" reaches this far ahead (about three months). */
const MAX_DAYS_AHEAD = 90;
/** Don't allow a time that starts in less than this. */
const MIN_LEAD_MS = 30 * 60 * 1000;

/** The day `offset` days from today, at `minutes` after midnight. */
function dayAt(offset: number, minutes = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

/** Starts in less than the minimum lead time (or is already past). */
function startsTooSoon(start: Date): boolean {
  return start.getTime() < Date.now() + MIN_LEAD_MS;
}

function hoursFor(dayOffset: number): number[] {
  const earliest = Date.now() + MIN_LEAD_MS;
  return HOURS.filter((h) => dayAt(dayOffset, h * 60).getTime() > earliest);
}

/**
 * S17 Start Something (Airbnb one-question-per-screen + Luma create): what →
 * which day → what time → where → WhatsApp link (optional) → preview → Publish.
 * Every answer is a big tap, and every question also has "my own answer":
 * Something else (type what it is) · Another day / Another time (big Earlier /
 * Later buttons, no calendar or wheels) · Somewhere else (type the place).
 */
export default function CreateEventScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const { data: me } = useMe();
  const create = useCreateEvent();

  const [step, setStep] = useState<Step>('what');
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [otherWhat, setOtherWhat] = useState('');
  const [dayOffset, setDayOffset] = useState<number | null>(null);
  const [customDay, setCustomDay] = useState(false);
  /** Minutes after midnight. */
  const [minutes, setMinutes] = useState<number | null>(null);
  const [customTime, setCustomTime] = useState(false);
  const [placeKey, setPlaceKey] = useState<(typeof PLACES)[number] | null>(null);
  const [placeOther, setPlaceOther] = useState(false);
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
  const placeName = placeOther ? placeTyped.trim() : placeKey ? placeLabel(placeKey) : '';
  const start = dayOffset !== null && minutes !== null ? dayAt(dayOffset, minutes) : null;
  const tooSoon = start !== null && startsTooSoon(start);
  const ownWhat = category === 'other' ? otherWhat.trim() : '';
  const shownTitle = title.trim() || ownWhat || (category ? t(`category.${category}.title`) : '');

  const canContinue: Record<Step, boolean> = {
    // "Something else" needs a few words about what it is.
    what: category !== null && (category !== 'other' || ownWhat !== ''),
    day: dayOffset !== null,
    time: minutes !== null && !tooSoon,
    where: placeName !== '',
    link: true,
    preview: shownTitle !== '' && start !== null && !tooSoon && !create.isPending,
  };

  const chooseDay = (offset: number, custom: boolean) => {
    setDayOffset(offset);
    setCustomDay(custom);
    // A listed time chosen for another day may not exist on this one.
    if (minutes !== null && !customTime && !hoursFor(offset).includes(minutes / 60)) {
      setMinutes(null);
    }
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
          my_rsvp: 'going',
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
      section="community"
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
          {category === 'other' ? (
            <TextField
              label={t('create.whatOther')}
              hint={t('create.whatOtherHint')}
              value={otherWhat}
              onChangeText={setOtherWhat}
              autoFocus
              returnKeyType="done"
              testID="create-what-typed"
            />
          ) : null}
        </>
      ) : null}

      {step === 'day' ? (
        <>
          <Text variant="heading">{question.day}</Text>
          <ChipGroup>
            {days.map((offset) => (
              <Chip
                key={offset}
                label={formatDay(dayAt(offset, 12 * 60), language, t)}
                selected={!customDay && dayOffset === offset}
                onPress={() => chooseDay(offset, false)}
                testID={`create-day-${offset}`}
              />
            ))}
            <Chip
              icon={CalendarBlankIcon}
              label={t('create.anotherDay')}
              selected={customDay}
              onPress={() => chooseDay(dayOffset ?? DAYS_AHEAD, true)}
              testID="create-day-other"
            />
          </ChipGroup>
          {customDay && dayOffset !== null ? (
            <DayAdjuster
              offset={dayOffset}
              onChange={(offset) => chooseDay(offset, true)}
              language={language}
              max={MAX_DAYS_AHEAD}
            />
          ) : null}
        </>
      ) : null}

      {step === 'time' && dayOffset !== null ? (
        <>
          <Text variant="heading">{question.time}</Text>
          <ChipGroup>
            {hoursFor(dayOffset).map((h) => (
              <Chip
                key={h}
                label={formatTime(dayAt(dayOffset, h * 60), language)}
                selected={!customTime && minutes === h * 60}
                onPress={() => {
                  setCustomTime(false);
                  setMinutes(h * 60);
                }}
                testID={`create-time-${h}`}
              />
            ))}
            <Chip
              icon={ClockIcon}
              label={t('create.anotherTime')}
              selected={customTime}
              onPress={() => {
                setCustomTime(true);
                setMinutes((m) => m ?? 10 * 60);
              }}
              testID="create-time-other"
            />
          </ChipGroup>
          {customTime && minutes !== null ? (
            <TimeAdjuster minutes={minutes} onChange={setMinutes} language={language} />
          ) : null}
          {tooSoon ? (
            <StatusBanner tone="notice" text={t('create.tooSoon')} testID="create-too-soon" />
          ) : null}
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
                selected={!placeOther && placeKey === p}
                onPress={() => {
                  setPlaceKey(p);
                  setPlaceOther(false);
                }}
                testID={`create-place-${p}`}
              />
            ))}
            <Chip
              icon={MapPinIcon}
              label={t('create.somewhereElse')}
              selected={placeOther}
              onPress={() => setPlaceOther(true)}
              testID="create-place-other"
            />
          </ChipGroup>
          {placeOther ? (
            <TextField
              label={t('create.placeOther')}
              value={placeTyped}
              onChangeText={setPlaceTyped}
              autoFocus
              returnKeyType="done"
              testID="create-place-typed"
            />
          ) : null}
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
          {/* Luma's create screen: the cover, the name, then When / Where / WhatsApp as rows. */}
          <View style={styles.cover}>
            <CoverArt
              photoUrl={null}
              icon={CATEGORY_ICON[preview.category]}
              tint={preview.category}
              size={PREVIEW_COVER}
              rounded="card"
            />
          </View>
          <TextField
            label={t('create.nameLabel')}
            value={title || shownTitle}
            onChangeText={setTitle}
            testID="create-title"
          />
          <GroupedList>
            <GroupedRow
              icon={ClockIcon}
              tint="exercise"
              title={t('create.whenRow')}
              value={start ? formatWhen(start, language, t) : ''}
              onPress={() => setStep('day')}
              testID="create-edit-when"
            />
            <GroupedRow
              icon={MapPinIcon}
              tint="cooking"
              title={t('create.whereRow')}
              value={placeName}
              onPress={() => setStep('where')}
              testID="create-edit-where"
            />
            <GroupedRow
              icon={WhatsappLogoIcon}
              tint="walk"
              title={t('create.linkRow')}
              value={link.trim() ? t('create.linkAdded') : t('create.linkNone')}
              onPress={() => setStep('link')}
              testID="create-edit-link"
            />
          </GroupedList>
          <Text color="textSecondary">{t('create.previewHint')}</Text>
          {/* Exactly the card others will see; not tappable here. */}
          <View pointerEvents="none" style={styles.preview}>
            <EventCard event={preview} hosting onOpen={() => {}} onGoing={() => {}} />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const PREVIEW_COVER = 160;

const styles = StyleSheet.create({
  cover: {
    ...shadow.floating,
    alignSelf: 'center',
    borderRadius: radius.card,
    borderWidth: borderWidth.control * 2,
    borderColor: color.bg,
    backgroundColor: color.bg,
  },
  preview: {
    marginTop: space.xs,
  },
});
