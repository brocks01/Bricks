import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useSendThanks, useSkipThanks, useThanksPrompts } from '@/api';
import {
  BigButton,
  CheckCircleIcon,
  EmptyState,
  MicrophoneIcon,
  PaperPlaneTiltIcon,
  QueryState,
  RecordPanel,
  Screen,
  StatusBanner,
  Text,
  ThumbsUpIcon,
} from '@/components';
import type { Recording } from '@/features/voice/useRecorder';
import { color, iconSize, space } from '@/theme';

/** A spoken thank-you is short: 20 seconds (docs/02b S34). */
const THANKS_SECONDS = 20;

/**
 * S34 Thank-you prompt (after an event, only for people who went): "How was
 * Mdm Tan's kueh class?" · Thank Mdm Tan (one tap) · Say thank you (record up to
 * 20 s, listen, Send) · Skip. Only kind words: no stars, nothing negative.
 */
export default function ThankYouPromptScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const prompts = useThanksPrompts();
  const send = useSendThanks();
  const skip = useSkipThanks();
  const [recordMode, setRecordMode] = useState(false);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/pass-it-on'));

  const prompt = prompts.data?.find((p) => p.event_id === eventId);
  const host = prompt?.host.name ?? '';
  const question = prompt
    ? t('passItOn.prompt.question', { name: host, event: prompt.event_title })
    : '';

  const thank = async (kind: 'thumb' | 'voice') => {
    if (!prompt) return;
    try {
      await send.mutateAsync({
        event_id: prompt.event_id,
        kind,
        audio_uri: kind === 'voice' ? (recording?.uri ?? null) : null,
        duration_s: kind === 'voice' ? (recording?.durationS ?? null) : null,
      });
      setSentTo(host);
    } catch {
      // Banner below; nothing is lost.
    }
  };

  if (sentTo) {
    return (
      <Screen
        readOut={() => t('passItOn.prompt.sent', { name: sentTo })}
        readOnOpen
        tellMe={false}
        testID="screen-thank-you-sent"
        footer={<BigButton label={t('common.done')} onPress={close} testID="thank-done" />}
      >
        <View style={styles.sent}>
          <CheckCircleIcon size={iconSize.celebrate} color={color.success} weight="fill" />
          <Text variant="title" align="center" testID="thank-sent">
            {t('passItOn.prompt.sent', { name: sentTo })}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title={t('passItOn.prompt.title')}
      readOut={() =>
        prompt
          ? `${question} ${t('passItOn.prompt.readout', { name: host })}`
          : t('passItOn.prompt.title')
      }
      tellMe={false}
      testID="screen-thank-you"
    >
      <QueryState query={prompts}>
        {() =>
          !prompt ? (
            <EmptyState text={t('passItOn.prompt.none')} />
          ) : (
            <View style={styles.body}>
              <Text variant="heading">{question}</Text>
              {recordMode ? (
                <>
                  <RecordPanel
                    maxSeconds={THANKS_SECONDS}
                    onChange={setRecording}
                    testID="thanks"
                  />
                  <BigButton
                    icon={PaperPlaneTiltIcon}
                    label={t('passItOn.prompt.send')}
                    disabled={!recording || send.isPending}
                    onPress={() => void thank('voice')}
                    testID="thank-send"
                  />
                </>
              ) : (
                <>
                  <BigButton
                    size="lg"
                    variant="success"
                    icon={ThumbsUpIcon}
                    label={t('passItOn.prompt.thank', { name: host })}
                    disabled={send.isPending}
                    onPress={() => void thank('thumb')}
                    testID="thank-thumb"
                  />
                  <BigButton
                    icon={MicrophoneIcon}
                    label={t('passItOn.prompt.sayThanks')}
                    onPress={() => setRecordMode(true)}
                    testID="thank-voice"
                  />
                </>
              )}
              {send.isError ? <StatusBanner tone="notice" text={t('common.error')} /> : null}
              <BigButton
                variant="outline"
                label={t('passItOn.prompt.skip')}
                disabled={skip.isPending}
                onPress={() => {
                  skip.mutate(prompt.event_id);
                  close();
                }}
                testID="thank-skip"
              />
            </View>
          )
        }
      </QueryState>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space.sm,
  },
  sent: {
    alignItems: 'center',
    gap: space.md,
    marginTop: space.xxl,
  },
});
