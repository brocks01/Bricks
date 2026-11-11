import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';

import { useCreateSkill, useDeleteSkill, useMe } from '@/api';
import type { Interest } from '@/api/types';
import {
  BigButton,
  CalendarBlankIcon,
  Card,
  Chip,
  ChipGroup,
  InfoRow,
  MapPinIcon,
  MicrophoneIcon,
  Screen,
  StatusBanner,
  StepProgress,
  Text,
  TextField,
  Tile,
  TileGrid,
} from '@/components';
import { INTEREST_ICON, INTERESTS, interestsIn } from '@/features/profile/interests';
import { VoiceInputSheet } from '@/features/voice/VoiceInputSheet';
import { formatDay, formatTime, formatWhen } from '@/lib/format';
import { useUndo } from '@/state/undo';
import { useTypography } from '@/theme/TypographyProvider';

const STEPS = ['what', 'when', 'where', 'price', 'preview'] as const;
type Step = (typeof STEPS)[number];
const QUESTIONS = STEPS.length - 1;
const HOURS = [9, 10, 11, 14, 15, 16, 19];
const PLACES = ['cc', 'park', 'voidDeck', 'hawker'] as const;
const DAYS_AHEAD = 7;
const MIN_LEAD_MS = 60 * 60 * 1000;

function dayAt(offset: number, hour = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const hoursFor = (offset: number) =>
  HOURS.filter((h) => dayAt(offset, h).getTime() > Date.now() + MIN_LEAD_MS);

/**
 * S32 Share a skill (Airbnb Experiences listing, one question at a time):
 * What can you share? (tap a topic, or say it) → When? (a day and time, or "when
 * people ask") → Where? → Free (paid comes later) → Preview → Publish.
 * A session with a date also appears in Kampung as an event (PO-4).
 */
export default function ShareSkillScreen() {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();
  const { data: me } = useMe();
  const create = useCreateSkill();
  const remove = useDeleteSkill();
  const showUndo = useUndo((s) => s.show);

  const [step, setStep] = useState<Step>('what');
  const [tag, setTag] = useState<Interest | null>(null);
  const [title, setTitle] = useState('');
  const [listening, setListening] = useState(false);
  const [flexible, setFlexible] = useState(false);
  const [dayOffset, setDayOffset] = useState<number | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [placeKey, setPlaceKey] = useState<(typeof PLACES)[number] | 'anywhere' | null>(null);
  const [placeTyped, setPlaceTyped] = useState('');
  const index = STEPS.indexOf(step);
  const area = me?.area_name ?? '';

  const days = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => i).filter((i) => hoursFor(i).length > 0),
    [],
  );
  const start = !flexible && dayOffset !== null && hour !== null ? dayAt(dayOffset, hour) : null;
  const placeLabel = (key: (typeof PLACES)[number]) =>
    area ? t(`create.place.${key}`, { area }) : t(`create.placeGeneric.${key}`);
  const placeName =
    placeTyped.trim() || (placeKey && placeKey !== 'anywhere' ? placeLabel(placeKey) : '');
  const shownTitle =
    title.trim() || (tag ? t('share.defaultTitle', { skill: t(`interests.${tag}`) }) : '');

  const canContinue: Record<Step, boolean> = {
    what: tag !== null,
    when: flexible || (dayOffset !== null && hour !== null),
    // A session with a date needs a place; "when people ask" can be anywhere.
    where: start ? placeName !== '' : placeKey !== null || placeName !== '',
    price: true,
    preview: shownTitle !== '' && !create.isPending,
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

  const publish = async () => {
    if (!tag) return;
    try {
      const skill = await create.mutateAsync({
        title: shownTitle,
        tags: [tag],
        start_at: start?.toISOString() ?? null,
        place_name: placeName || null,
        is_paid: false,
      });
      showUndo(skill.event_id ? t('share.publishedWithEvent') : t('share.published'), () =>
        remove.mutate(skill.id),
      );
      if (router.canGoBack()) router.back();
    } catch {
      // Banner below; nothing is lost.
    }
  };

  const next = () => {
    if (step === 'preview') return void publish();
    setStep(STEPS[index + 1]!);
  };

  const heard = (said: string) => {
    setListening(false);
    setTitle(said);
    const found = interestsIn(said, (i) => t(`interests.${i}`));
    if (found[0]) setTag(found[0]);
  };

  const question = step === 'preview' ? t('share.preview') : t(`share.${step}`);
  const when = start ? formatWhen(start, language, t) : t('passItOn.skill.anyTime');

  return (
    <Screen
      title={t('passItOn.shareSkill')}
      readOut={() =>
        step === 'preview'
          ? `${question} ${shownTitle}. ${when}. ${placeName || t('share.anywhere')}. ${t('passItOn.skill.free')}`
          : t('create.readoutStep', { step: index + 1, total: QUESTIONS, question })
      }
      back
      onBack={goBack}
      testID="screen-share-skill"
      footer={
        <BigButton
          label={step === 'preview' ? t('create.publish') : t('common.next')}
          disabled={!canContinue[step]}
          onPress={next}
          testID="share-next"
        />
      }
    >
      {step !== 'preview' ? <StepProgress step={index + 1} total={QUESTIONS} /> : null}
      <Text variant="heading">{question}</Text>

      {step === 'what' ? (
        <>
          <TileGrid>
            {INTERESTS.map((i) => (
              <Tile
                key={i}
                icon={INTEREST_ICON[i]}
                label={t(`interests.${i}`)}
                selected={tag === i}
                onPress={() => setTag(i)}
                testID={`share-tag-${i}`}
              />
            ))}
          </TileGrid>
          <TextField
            label={t('share.titleLabel')}
            value={title || shownTitle}
            onChangeText={setTitle}
            testID="share-title"
          />
          <BigButton
            variant="outline"
            icon={MicrophoneIcon}
            label={t('onboarding.sayIt')}
            onPress={() => setListening(true)}
            testID="share-say-it"
          />
        </>
      ) : null}

      {step === 'when' ? (
        <>
          <ChipGroup>
            <Chip
              label={t('share.flexible')}
              selected={flexible}
              onPress={() => {
                setFlexible(true);
                setDayOffset(null);
                setHour(null);
              }}
              testID="share-when-flexible"
            />
            {days.map((d) => (
              <Chip
                key={d}
                label={formatDay(dayAt(d, 12), language, t)}
                selected={!flexible && dayOffset === d}
                onPress={() => {
                  setFlexible(false);
                  setDayOffset(d);
                  setHour(null);
                }}
                testID={`share-day-${d}`}
              />
            ))}
          </ChipGroup>
          {!flexible && dayOffset !== null ? (
            <>
              <Text variant="bodyStrong">{t('create.time')}</Text>
              <ChipGroup>
                {hoursFor(dayOffset).map((h) => (
                  <Chip
                    key={h}
                    label={formatTime(dayAt(dayOffset, h), language)}
                    selected={hour === h}
                    onPress={() => setHour(h)}
                    testID={`share-hour-${h}`}
                  />
                ))}
              </ChipGroup>
            </>
          ) : null}
        </>
      ) : null}

      {step === 'where' ? (
        <>
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
                testID={`share-place-${p}`}
              />
            ))}
            {!start ? (
              <Chip
                label={t('share.anywhere')}
                selected={placeKey === 'anywhere' && !placeTyped.trim()}
                onPress={() => {
                  setPlaceKey('anywhere');
                  setPlaceTyped('');
                }}
                testID="share-place-anywhere"
              />
            ) : null}
          </ChipGroup>
          <TextField
            label={t('create.placeOther')}
            value={placeTyped}
            onChangeText={setPlaceTyped}
            testID="share-place-typed"
          />
        </>
      ) : null}

      {step === 'price' ? (
        <>
          <StatusBanner tone="success" text={t('share.free')} testID="share-free" />
          <Text color="textSecondary">{t('share.paidLater')}</Text>
        </>
      ) : null}

      {step === 'preview' ? (
        <>
          <Text color="textSecondary">{t('create.previewHint')}</Text>
          <Card testID="share-preview">
            <Text variant="heading">{shownTitle}</Text>
            <InfoRow icon={CalendarBlankIcon} text={when} />
            <InfoRow icon={MapPinIcon} text={placeName || t('share.anywhere')} />
            <Text color="textSecondary">{t('passItOn.skill.free')}</Text>
          </Card>
          {start ? <StatusBanner text={t('share.alsoEvent')} /> : null}
          {create.isError ? <StatusBanner tone="notice" text={t('common.error')} /> : null}
        </>
      ) : null}

      <VoiceInputSheet
        visible={listening}
        demoPhrases={[
          t('share.demoPhrase', { skill: t('interests.chess') }),
          t('share.demoPhrase', { skill: t('interests.cooking') }),
        ]}
        onResult={heard}
        onClose={() => setListening(false)}
      />
    </Screen>
  );
}
