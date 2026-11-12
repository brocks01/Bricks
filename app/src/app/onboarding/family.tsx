import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';

import { useCreateFamilyInvite } from '@/api';
import type { Interest, Relation } from '@/api/types';
import {
  BigButton,
  Card,
  Chip,
  ChipGroup,
  PaperPlaneTiltIcon,
  Screen,
  StatusBanner,
  StepProgress,
  Text,
  TextField,
  Tile,
  TileGrid,
  YesNo,
} from '@/components';
import { useResumeHere } from '@/features/onboarding/useResumeHere';
import { INTEREST_ICON, INTERESTS } from '@/features/profile/interests';
import { LanguagePicker } from '@/features/settings/LanguagePicker';
import { LANGUAGE_INFO, type Language } from '@/i18n/languages';
import { isSingaporeMobile, normalisePhone } from '@/lib/phone';
import { useOnboarding } from '@/state/onboarding';
import { borderWidth, color, radius, space, touch } from '@/theme';

const STEPS = [
  'name',
  'phone',
  'relation',
  'language',
  'interests',
  'safeCircle',
  'review',
] as const;
type Step = (typeof STEPS)[number];
const QUESTIONS = STEPS.length - 1;
const RELATIONS: readonly Relation[] = ['mother', 'father', 'grandmother', 'grandfather', 'other'];

/**
 * S9 Add my parent (LifeSG forms): one labelled question at a time, then a
 * review before anything is sent. Nothing is set up until the parent says yes
 * to the invite on WhatsApp or SMS (ON-5): their account stays inactive till then.
 */
export default function AddParentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const complete = useOnboarding((s) => s.complete);
  const create = useCreateFamilyInvite();
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [relation, setRelation] = useState<Relation | null>(null);
  const [language, setLanguage] = useState<Language | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [addMe, setAddMe] = useState(true);
  const index = STEPS.indexOf(step);
  useResumeHere('/onboarding/family');

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

  const canContinue: Record<Step, boolean> = {
    name: name.trim() !== '',
    phone: phone.trim() !== '',
    relation: relation !== null,
    language: language !== null,
    // Optional: they can choose for themselves later.
    interests: true,
    safeCircle: true,
    review: !create.isPending,
  };

  const send = async () => {
    if (!relation || !language) return;
    try {
      await create.mutateAsync({
        senior_name: name.trim(),
        senior_phone: normalisePhone(phone),
        relation,
        language,
        interests,
        add_me_to_safe_circle: addMe,
      });
      complete();
      if (router.canDismiss()) router.dismissAll();
      router.replace('/family');
    } catch {
      // The banner says it didn't work; Send invite stays for another go.
    }
  };

  const next = () => {
    if (step === 'phone' && !isSingaporeMobile(phone)) {
      setPhoneError(t('onboarding.signIn.phoneInvalid'));
      return;
    }
    if (step === 'review') return void send();
    setStep(STEPS[index + 1]!);
  };

  const who = name.trim() || t('family.them');
  const question =
    step === 'review' ? t('family.add.review') : t(`family.add.${step}`, { name: who });

  const reviewRows: { step: Step; label: string; value: string }[] = [
    { step: 'name', label: t('family.add.reviewName'), value: name.trim() },
    { step: 'phone', label: t('family.add.reviewPhone'), value: phone.trim() },
    {
      step: 'relation',
      label: t('family.add.reviewRelation'),
      value: relation ? t(`family.relation.${relation}`) : '',
    },
    {
      step: 'language',
      label: t('family.add.reviewLanguage'),
      value: language ? LANGUAGE_INFO[language].nativeName : '',
    },
    {
      step: 'interests',
      label: t('family.add.reviewInterests'),
      value: interests.length
        ? interests.map((i) => t(`interests.${i}`)).join(', ')
        : t('family.add.notChosen'),
    },
    {
      step: 'safeCircle',
      label: t('family.add.reviewSafeCircle'),
      value: addMe ? t('common.yes') : t('common.no'),
    },
  ];

  return (
    <Screen
      title={t('family.add.title')}
      readOut={() =>
        step === 'review'
          ? `${question} ${reviewRows.map((r) => `${r.label}: ${r.value}.`).join(' ')} ${t('family.add.readoutSend')}`
          : t('family.add.readoutStep', { step: index + 1, total: QUESTIONS, question })
      }
      back
      onBack={goBack}
      testID="screen-family-add"
      footer={
        <BigButton
          icon={step === 'review' ? PaperPlaneTiltIcon : undefined}
          label={step === 'review' ? t('family.add.send') : t('common.next')}
          disabled={!canContinue[step]}
          onPress={next}
          testID="family-next"
        />
      }
    >
      {step !== 'review' ? <StepProgress step={index + 1} total={QUESTIONS} /> : null}
      <Text variant="heading">{question}</Text>

      {step === 'name' ? (
        <TextField
          label={t('family.add.nameLabel')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          testID="family-name"
        />
      ) : null}

      {step === 'phone' ? (
        <TextField
          label={t('family.add.phoneLabel')}
          hint={t('family.add.phoneHint', { name: who })}
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            setPhoneError(null);
          }}
          keyboardType="phone-pad"
          error={phoneError}
          testID="family-phone"
        />
      ) : null}

      {step === 'relation' ? (
        <ChipGroup>
          {RELATIONS.map((r) => (
            <Chip
              key={r}
              label={t(`family.relation.${r}`)}
              selected={relation === r}
              onPress={() => setRelation(r)}
              testID={`family-relation-${r}`}
            />
          ))}
        </ChipGroup>
      ) : null}

      {step === 'language' ? <LanguagePicker selected={language} onChoose={setLanguage} /> : null}

      {step === 'interests' ? (
        <>
          <Text color="textSecondary">{t('family.add.interestsHint', { name: who })}</Text>
          <TileGrid>
            {INTERESTS.map((interest) => (
              <Tile
                key={interest}
                icon={INTEREST_ICON[interest]}
                label={t(`interests.${interest}`)}
                selected={interests.includes(interest)}
                onPress={() =>
                  setInterests((list) =>
                    list.includes(interest)
                      ? list.filter((i) => i !== interest)
                      : [...list, interest],
                  )
                }
                testID={`family-interest-${interest}`}
              />
            ))}
          </TileGrid>
        </>
      ) : null}

      {step === 'safeCircle' ? (
        <>
          <Text>{t('family.add.safeCircleWhy', { name: who })}</Text>
          <YesNo
            onYes={() => {
              setAddMe(true);
              setStep('review');
            }}
            onNo={() => {
              setAddMe(false);
              setStep('review');
            }}
            testID="family-add-me"
          />
        </>
      ) : null}

      {step === 'review' ? (
        <>
          {reviewRows.map((row) => (
            <Pressable
              key={row.step}
              accessibilityRole="button"
              accessibilityLabel={`${row.label}: ${row.value}. ${t('family.add.change')}`}
              onPress={() => setStep(row.step)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              testID={`family-review-${row.step}`}
            >
              <View style={styles.flex}>
                <Text color="textSecondary">{row.label}</Text>
                <Text variant="bodyStrong">{row.value}</Text>
              </View>
              <Text variant="bodyStrong" color="primary">
                {t('family.add.change')}
              </Text>
            </Pressable>
          ))}
          <Card tone="subtle">
            <Text>{t('family.add.consent', { name: who })}</Text>
          </Card>
          {create.isError ? <StatusBanner tone="notice" text={t('common.error')} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: touch.min,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    borderColor: color.border,
  },
  rowPressed: {
    backgroundColor: color.bgSubtle,
  },
  flex: {
    flex: 1,
  },
});
