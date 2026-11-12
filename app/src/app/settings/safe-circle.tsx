import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSafeCircle, useSetSafeCircle } from '@/api';
import type { NewSafeCircleMember } from '@/api/types';
import { BigButton, QueryState, Screen, StatusBanner, Text } from '@/components';
import { SafeCircleEditor } from '@/features/safety/SafeCircleEditor';
import { useUndo } from '@/state/undo';

/** Settings → Safe Circle: the same editor as onboarding (S6), saved with one button. */
export default function SafeCircleSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const circle = useSafeCircle();
  const save = useSetSafeCircle();
  const showUndo = useUndo((s) => s.show);
  const [edited, setEdited] = useState<NewSafeCircleMember[] | null>(null);
  const saved: NewSafeCircleMember[] = (circle.data ?? []).map(({ name, phone, is_family }) => ({
    name,
    phone,
    is_family,
  }));
  const members = edited ?? saved;

  const onSave = async () => {
    try {
      await save.mutateAsync(members);
      showUndo(t('safeCircle.saved'), () => save.mutate(saved));
      if (router.canGoBack()) router.back();
    } catch {
      // Banner below; the list stays as edited.
    }
  };

  return (
    <Screen
      section="settings"
      title={t('settings.safeCircle')}
      readOut={() => `${t('onboarding.safeCircle.title')} ${members.map((m) => m.name).join(', ')}`}
      testID="screen-settings-safe-circle"
      footer={
        <BigButton
          label={t('common.save')}
          disabled={edited === null || save.isPending}
          onPress={() => void onSave()}
          testID="safe-circle-save"
        />
      }
    >
      <Text>{t('onboarding.safeCircle.why')}</Text>
      <QueryState query={circle}>
        {() => <SafeCircleEditor members={members} onChange={setEdited} />}
      </QueryState>
      {save.isError ? <StatusBanner tone="notice" text={t('common.error')} /> : null}
    </Screen>
  );
}
