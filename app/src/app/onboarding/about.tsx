import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler } from 'react-native';

import type { Interest } from '@/api/types';
import {
  BigButton,
  Chip,
  ChipGroup,
  MicrophoneIcon,
  Screen,
  StepProgress,
  Text,
  TextField,
  Tile,
  TileGrid,
} from '@/components';
import { useResumeHere } from '@/features/onboarding/useResumeHere';
import { INTEREST_ICON, INTERESTS, interestsIn } from '@/features/profile/interests';
import { VoiceInputSheet } from '@/features/voice/VoiceInputSheet';
import { useOnboarding } from '@/state/onboarding';

const STEPS = ['name', 'area', 'interests'] as const;
type Step = (typeof STEPS)[number];

/** Areas near the pilot (docs/01 §3). Place names aren't translated. */
const AREAS = ['Bishan', 'Toa Payoh', 'Ang Mo Kio', 'Tampines', 'Jurong West', 'Woodlands'];

/** What a facilitator can tap for "Say it instead" on mock data. */
const DEMO_NAMES = ['Raj', 'Uncle Lim', 'Mdm Tan'];

/**
 * S4 One-question steps (Airbnb host onboarding): What should we call you? →
 * Where do you live? → What do you enjoy? One question per screen, "Step 1 of 3",
 * a big Next fixed at the bottom, and "Say it instead" for every answer.
 * Every step can be skipped (ON-7): with no answer, Next reads "Skip for now".
 */
export default function AboutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const draft = useOnboarding((s) => s.draft);
  const updateDraft = useOnboarding((s) => s.updateDraft);
  const [step, setStep] = useState<Step>('name');
  const [listening, setListening] = useState(false);
  const [otherArea, setOtherArea] = useState(draft.area !== '' && !AREAS.includes(draft.area));
  const index = STEPS.indexOf(step);
  useResumeHere('/onboarding/about');

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

  const answered: Record<Step, boolean> = {
    name: draft.preferredName.trim() !== '',
    area: draft.area.trim() !== '',
    interests: draft.interests.length > 0,
  };

  const next = () => {
    if (step === 'interests') router.push('/onboarding/voice-intro');
    else setStep(STEPS[index + 1]!);
  };

  const toggleInterest = (interest: Interest) =>
    updateDraft({
      interests: draft.interests.includes(interest)
        ? draft.interests.filter((i) => i !== interest)
        : [...draft.interests, interest],
    });

  const interestLabel = (i: Interest) => t(`interests.${i}`);
  const heard = (said: string) => {
    setListening(false);
    if (step === 'name') updateDraft({ preferredName: said });
    if (step === 'area') {
      const known = AREAS.find((a) => said.toLowerCase().includes(a.toLowerCase()));
      setOtherArea(!known);
      updateDraft({ area: known ?? said });
    }
    if (step === 'interests') {
      const found = interestsIn(said, interestLabel);
      updateDraft({ interests: [...new Set([...draft.interests, ...found])] });
    }
  };

  const question = t(`onboarding.about.${step}.title`);
  const demoPhrases: Record<Step, string[]> = {
    name: DEMO_NAMES,
    area: AREAS.slice(0, 3),
    interests: [
      t('onboarding.about.interests.demo', {
        a: interestLabel('walking'),
        b: interestLabel('chess'),
      }),
      interestLabel('cooking'),
    ],
  };

  return (
    <Screen
      readOut={() =>
        t('onboarding.about.readout', {
          step: index + 1,
          total: STEPS.length,
          question,
          hint: t(`onboarding.about.${step}.readoutHint`),
        })
      }
      back
      onBack={goBack}
      tellMe={false}
      testID="screen-onboarding-about"
      footer={
        <BigButton
          label={answered[step] ? t('common.next') : t('onboarding.skipForNow')}
          variant={answered[step] ? 'primary' : 'outline'}
          onPress={next}
          testID="about-next"
        />
      }
    >
      <StepProgress step={index + 1} total={STEPS.length} />
      <Text variant="title">{question}</Text>

      {step === 'name' ? (
        <TextField
          label={t('onboarding.about.name.label')}
          value={draft.preferredName}
          onChangeText={(preferredName) => updateDraft({ preferredName })}
          autoCapitalize="words"
          autoComplete="given-name"
          testID="about-name"
        />
      ) : null}

      {step === 'area' ? (
        <>
          <ChipGroup>
            {AREAS.map((area) => (
              <Chip
                key={area}
                label={area}
                selected={!otherArea && draft.area === area}
                onPress={() => {
                  setOtherArea(false);
                  updateDraft({ area });
                }}
                testID={`about-area-${area.replace(/\s/g, '')}`}
              />
            ))}
            <Chip
              label={t('onboarding.about.area.other')}
              selected={otherArea}
              onPress={() => {
                setOtherArea(true);
                updateDraft({ area: '' });
              }}
              testID="about-area-other"
            />
          </ChipGroup>
          {otherArea ? (
            <TextField
              label={t('onboarding.about.area.label')}
              value={draft.area}
              onChangeText={(area) => updateDraft({ area })}
              autoCapitalize="words"
              testID="about-area-typed"
            />
          ) : null}
        </>
      ) : null}

      {step === 'interests' ? (
        <>
          <Text color="textSecondary">{t('onboarding.about.interests.hint')}</Text>
          <TileGrid>
            {INTERESTS.map((interest) => (
              <Tile
                key={interest}
                icon={INTEREST_ICON[interest]}
                label={interestLabel(interest)}
                selected={draft.interests.includes(interest)}
                onPress={() => toggleInterest(interest)}
                testID={`about-interest-${interest}`}
              />
            ))}
          </TileGrid>
        </>
      ) : null}

      <BigButton
        variant="outline"
        icon={MicrophoneIcon}
        label={t('onboarding.sayIt')}
        onPress={() => setListening(true)}
        testID="about-say-it"
      />

      <VoiceInputSheet
        visible={listening}
        demoPhrases={demoPhrases[step]}
        onResult={heard}
        onClose={() => setListening(false)}
      />
    </Screen>
  );
}
