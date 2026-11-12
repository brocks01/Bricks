import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useHealthCard, useSaveHealthCard } from '@/api';
import { BLOOD_GROUPS, type BloodGroup, type HealthCard } from '@/api/types';
import {
  BigButton,
  ButtonRow,
  Chip,
  ChipGroup,
  GroupedList,
  GroupedRow,
  PhoneIcon,
  QueryState,
  Screen,
  ShieldCheckIcon,
  StatusBanner,
  Text,
  TextField,
  showToast,
} from '@/components';
import { formatDay } from '@/lib/format';
import { openExternal } from '@/lib/openExternal';
import { space } from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

/**
 * S27 Health Card (LifeSG / Apple Medical ID): blood group, conditions, medicines and
 * who to call (the Safe Circle). Only the member and their family see it, and it
 * says so. Family can edit it too (`?senior=…&name=Dad` from the Family screen).
 */
export default function HealthCardScreen() {
  const { senior, name } = useLocalSearchParams<{ senior?: string; name?: string }>();
  const { t } = useTranslation();
  const card = useHealthCard(senior);
  const [editing, setEditing] = useState(false);
  const title = name ? t('healthCard.titleFor', { name }) : t('healthCard.title');

  const readOut = () => {
    const c = card.data;
    if (!c) return title;
    return t('healthCard.readout', {
      title,
      blood: c.blood_group ?? t('healthCard.notAdded'),
      conditions: c.conditions || t('healthCard.noneAdded'),
      medicines: c.medicines.replace(/\n/g, '. ') || t('healthCard.noneAdded'),
    });
  };

  return (
    <Screen section="health" title={title} readOut={readOut} scroll testID="screen-health-card">
      <QueryState query={card}>
        {(c) =>
          editing ? (
            <EditCard card={c} senior={senior} onDone={() => setEditing(false)} />
          ) : (
            <ViewCard card={c} name={name} senior={senior} onEdit={() => setEditing(true)} />
          )
        }
      </QueryState>
    </Screen>
  );
}

function ViewCard({
  card,
  name,
  senior,
  onEdit,
}: {
  card: HealthCard;
  name?: string;
  senior?: string;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const { language } = useTypography();
  const router = useRouter();

  return (
    <>
      <StatusBanner
        tone="info"
        text={name ? t('healthCard.privateFor', { name }) : t('healthCard.private')}
        testID="health-card-private"
      />
      <GroupedList>
        <GroupedRow
          title={t('healthCard.bloodGroup')}
          value={card.blood_group ?? t('healthCard.notAdded')}
          testID="health-card-blood"
        />
        <GroupedRow
          title={t('healthCard.conditions')}
          subtitle={card.conditions || t('healthCard.noneAdded')}
          testID="health-card-conditions"
        />
        <GroupedRow
          title={t('healthCard.medicines')}
          subtitle={card.medicines || t('healthCard.noneAdded')}
          testID="health-card-medicines"
        />
      </GroupedList>

      <GroupedList title={t('healthCard.contacts')} testID="health-card-contacts">
        {card.emergency_contacts.length > 0 ? (
          card.emergency_contacts.map((c) => (
            <GroupedRow
              key={c.id}
              icon={PhoneIcon}
              tint="walk"
              title={c.name}
              value={c.phone ?? undefined}
              onPress={c.phone ? () => void openExternal(`tel:${c.phone}`) : undefined}
            />
          ))
        ) : senior ? (
          <GroupedRow title={t('healthCard.noContacts')} />
        ) : (
          <GroupedRow
            icon={ShieldCheckIcon}
            tint="walk"
            title={t('healthCard.addContacts')}
            onPress={() => router.push('/settings/safe-circle')}
          />
        )}
      </GroupedList>

      {card.updated_by && card.updated_at ? (
        <Text color="textSecondary" testID="health-card-updated">
          {t('healthCard.updatedBy', {
            name: card.updated_by.name.split(' ')[0],
            day: formatDay(new Date(card.updated_at), language, t),
          })}
        </Text>
      ) : null}
      <BigButton label={t('healthCard.edit')} onPress={onEdit} testID="health-card-edit" />
    </>
  );
}

function EditCard({
  card,
  senior,
  onDone,
}: {
  card: HealthCard;
  senior?: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const save = useSaveHealthCard(senior);
  const [blood, setBlood] = useState<BloodGroup | null>(card.blood_group);
  const [conditions, setConditions] = useState(card.conditions);
  const [medicines, setMedicines] = useState(card.medicines);

  return (
    <View style={styles.edit}>
      <Text variant="bodyStrong">{t('healthCard.bloodGroup')}</Text>
      <ChipGroup testID="health-card-blood-choices">
        {BLOOD_GROUPS.map((g) => (
          <Chip
            key={g}
            label={g}
            selected={blood === g}
            onPress={() => setBlood(g)}
            testID={`health-card-blood-${g}`}
          />
        ))}
        <Chip
          label={t('healthCard.dontKnow')}
          selected={blood === null}
          onPress={() => setBlood(null)}
          testID="health-card-blood-unknown"
        />
      </ChipGroup>
      <TextField
        label={t('healthCard.conditions')}
        hint={t('healthCard.conditionsHint')}
        value={conditions}
        onChangeText={setConditions}
        multiline
        testID="health-card-conditions-field"
      />
      <TextField
        label={t('healthCard.medicines')}
        hint={t('healthCard.medicinesHint')}
        value={medicines}
        onChangeText={setMedicines}
        multiline
        testID="health-card-medicines-field"
      />
      <ButtonRow>
        <BigButton
          label={t('common.save')}
          disabled={save.isPending}
          onPress={() =>
            save.mutate(
              { blood_group: blood, conditions, medicines },
              {
                onSuccess: () => {
                  onDone();
                  showToast(t('healthCard.saved'));
                },
              },
            )
          }
          testID="health-card-save"
        />
        <BigButton variant="outline" label={t('walkFeed.cancel')} onPress={onDone} />
      </ButtonRow>
    </View>
  );
}

const styles = StyleSheet.create({
  edit: {
    gap: space.sm,
  },
});
