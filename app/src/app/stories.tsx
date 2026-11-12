import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAskForStory, useDeleteStory, useRecordStory, useStories } from '@/api';
import type { Story, StoryQuestion } from '@/api/types';
import {
  BigButton,
  BottomSheet,
  Card,
  Chip,
  ChipGroup,
  ConfirmSheet,
  EmptyState,
  MicrophoneIcon,
  PaperPlaneTiltIcon,
  QueryState,
  RecordPanel,
  Screen,
  SheetHeader,
  StatusBanner,
  Text,
  TextField,
  TrashIcon,
  VoicePlayer,
  showToast,
} from '@/components';
import type { Recording } from '@/features/voice/useRecorder';
import { formatDuration } from '@/lib/format';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/** A life story can take a while to tell (the server allows 3 minutes). */
const STORY_SECONDS = 180;
/** Ideas when they don't know where to start. */
const PROMPTS = ['firstJob', 'met', 'growingUp', 'festival', 'advice'] as const;

/**
 * S35 Life Stories (Hinge voice prompts + a podcast list): questions their family
 * asked ("Ask Grandpa"), Record a story with ideas to start from, and every story to
 * play. Family (`?senior=…&name=Dad`) listen and ask a question instead.
 */
export default function StoriesScreen() {
  const { senior, name } = useLocalSearchParams<{ senior?: string; name?: string }>();
  const { t } = useTranslation();
  const query = useStories(senior);
  const [recording, setRecording] = useState<{ prompt: string; questionId: string | null } | null>(
    null,
  );
  const [asking, setAsking] = useState(false);
  const title = name ? t('stories.titleFor', { name }) : t('stories.title');

  return (
    <Screen
      section="activity"
      title={title}
      readOut={() =>
        t('stories.readout', {
          title,
          count: query.data?.stories.length ?? 0,
          questions: query.data?.questions.length ?? 0,
        })
      }
      scroll
      testID="screen-stories"
    >
      <QueryState query={query}>
        {(data) => (
          <>
            {senior ? (
              <>
                <BigButton
                  icon={PaperPlaneTiltIcon}
                  label={t('stories.ask', { name })}
                  onPress={() => setAsking(true)}
                  testID="stories-ask"
                />
                {data.questions.map((q) => (
                  <Text key={q.id} color="textSecondary" testID={`stories-waiting-${q.id}`}>
                    {t('stories.waiting', { text: q.text })}
                  </Text>
                ))}
              </>
            ) : (
              <>
                {data.questions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    onAnswer={() => setRecording({ prompt: q.text, questionId: q.id })}
                  />
                ))}
                <BigButton
                  size="lg"
                  icon={MicrophoneIcon}
                  label={t('stories.record')}
                  onPress={() => setRecording({ prompt: '', questionId: null })}
                  testID="stories-record"
                />
              </>
            )}

            <Text variant="heading" style={styles.heading}>
              {t('stories.list')}
            </Text>
            {data.stories.length === 0 ? (
              <EmptyState
                icon={MicrophoneIcon}
                text={senior ? t('stories.noneFor', { name }) : t('stories.none')}
              />
            ) : (
              data.stories.map((s) => <StoryCard key={s.id} story={s} mine={!senior} />)
            )}
          </>
        )}
      </QueryState>

      {recording ? (
        <RecordStorySheet
          prompt={recording.prompt}
          questionId={recording.questionId}
          onClose={() => setRecording(null)}
        />
      ) : null}
      {senior && asking ? (
        <AskSheet seniorId={senior} name={name ?? ''} onClose={() => setAsking(false)} />
      ) : null}
    </Screen>
  );
}

function QuestionCard({ question, onAnswer }: { question: StoryQuestion; onAnswer: () => void }) {
  const { t } = useTranslation();
  return (
    <Card tone="subtle" testID={`stories-question-${question.id}`}>
      <Text color="textSecondary">
        {t('stories.asked', { name: question.asked_by.name.split(' ')[0] })}
      </Text>
      <Text variant="heading">{question.text}</Text>
      <BigButton
        icon={MicrophoneIcon}
        label={t('stories.answer')}
        onPress={onAnswer}
        testID={`stories-answer-${question.id}`}
      />
    </Card>
  );
}

function StoryCard({ story, mine }: { story: Story; mine: boolean }) {
  const { t } = useTranslation();
  const remove = useDeleteStory();
  const [confirm, setConfirm] = useState(false);
  return (
    <Card testID={`story-${story.id}`}>
      <Text variant="heading">{story.title}</Text>
      <Text color="textSecondary">
        {[
          formatDuration(story.voice.duration_s),
          story.asked_by
            ? t('stories.askedLine', { name: story.asked_by.name.split(' ')[0] })
            : story.prompt_text,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>
      <VoicePlayer audioUrl={story.voice.audio_url} durationS={story.voice.duration_s} />
      {story.voice.transcript ? <Text>{story.voice.transcript}</Text> : null}
      {mine ? (
        <>
          <BigButton
            variant="outline"
            fullWidth={false}
            icon={TrashIcon}
            label={t('stories.delete')}
            labelVariant="bodyStrong"
            onPress={() => setConfirm(true)}
            testID={`story-delete-${story.id}`}
          />
          <ConfirmSheet
            visible={confirm}
            icon={TrashIcon}
            text={t('stories.deleteConfirm', { title: story.title })}
            onYes={() => {
              setConfirm(false);
              remove.mutate(story.id);
            }}
            onNo={() => setConfirm(false)}
          />
        </>
      ) : null}
    </Card>
  );
}

function RecordStorySheet({
  prompt,
  questionId,
  onClose,
}: {
  prompt: string;
  questionId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const record = useRecordStory();
  const [title, setTitle] = useState(prompt);
  const [clip, setClip] = useState<Recording | null>(null);

  return (
    <BottomSheet visible onRequestClose={onClose} testID="stories-sheet">
      <SheetHeader
        icon={MicrophoneIcon}
        title={questionId ? prompt : t('stories.record')}
        text={t('stories.recordHint')}
      />
      <View style={styles.sheet}>
        {questionId ? null : (
          <ChipGroup testID="stories-prompts">
            {PROMPTS.map((p) => (
              <Chip
                key={p}
                label={t(`stories.prompts.${p}`)}
                selected={title === t(`stories.prompts.${p}`)}
                onPress={() => setTitle(t(`stories.prompts.${p}`))}
                testID={`stories-prompt-${p}`}
              />
            ))}
          </ChipGroup>
        )}
        <TextField
          label={t('stories.storyTitle')}
          value={title}
          onChangeText={setTitle}
          testID="stories-title"
        />
        <RecordPanel maxSeconds={STORY_SECONDS} onChange={setClip} testID="story" />
        {record.isError ? <StatusBanner tone="notice" text={t('common.error')} /> : null}
        <BigButton
          label={t('stories.save')}
          disabled={!clip || title.trim() === '' || record.isPending}
          onPress={() =>
            clip &&
            record.mutate(
              {
                title,
                audio_uri: clip.uri,
                duration_s: clip.durationS,
                language,
                prompt_text: questionId ? null : title,
                question_id: questionId,
              },
              {
                onSuccess: () => {
                  onClose();
                  showToast(t('stories.saved'));
                },
              },
            )
          }
          testID="stories-save"
        />
        <BigButton variant="outline" label={t('walkFeed.cancel')} onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

function AskSheet({
  seniorId,
  name,
  onClose,
}: {
  seniorId: string;
  name: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const ask = useAskForStory(seniorId);
  const [text, setText] = useState('');

  return (
    <BottomSheet visible onRequestClose={onClose} testID="stories-ask-sheet">
      <SheetHeader icon={PaperPlaneTiltIcon} title={t('stories.ask', { name })} />
      <View style={styles.sheet}>
        <TextField
          label={t('stories.question')}
          hint={t('stories.questionHint')}
          value={text}
          onChangeText={setText}
          testID="stories-question-field"
        />
        {ask.isError ? <StatusBanner tone="notice" text={t('common.error')} /> : null}
        <BigButton
          label={t('stories.send')}
          disabled={text.trim().length < 3 || ask.isPending}
          onPress={() =>
            ask.mutate(text, {
              onSuccess: () => {
                onClose();
                showToast(t('stories.sent', { name }));
              },
            })
          }
          testID="stories-send"
        />
        <BigButton variant="outline" label={t('walkFeed.cancel')} onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: space.sm,
  },
  sheet: {
    gap: space.sm,
  },
});
