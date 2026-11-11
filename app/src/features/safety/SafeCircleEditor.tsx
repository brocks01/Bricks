import * as Contacts from 'expo-contacts';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { NewSafeCircleMember } from '@/api/types';
import { Avatar } from '@/components/Avatar';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { AddressBookIcon, PlusIcon, TrashIcon } from '@/components/primitives/icons';
import { Text } from '@/components/primitives/Text';
import { StatusBanner } from '@/components/StatusBanner';
import { TextField } from '@/components/TextField';
import { isSingaporeMobile, normalisePhone } from '@/lib/phone';
import { useUndo } from '@/state/undo';
import { space } from '@/theme';

/** Up to five people (docs/02b S6). */
export const SAFE_CIRCLE_MAX = 5;

type Picked = { name: string; phone: string | null } | 'cancelled' | 'denied';

/** Opens the phone's own contact picker (no list of everyone's contacts in our app). */
async function pickContact(): Promise<Picked> {
  const permission = await Contacts.requestPermissionsAsync();
  if (!permission.granted) return 'denied';
  const contact = await Contacts.Contact.presentPicker();
  if (!contact) return 'cancelled';
  const [name, phones] = await Promise.all([contact.getFullName(), contact.getPhones()]);
  return { name: name.trim(), phone: phones[0]?.number ?? null };
}

/**
 * S6 Safe Circle: who we tell if they need help. Pick from the phone's contacts,
 * or type a name and number. Each person is a large row with a Family choice
 * and a Remove button (with Undo). No swipe-to-delete.
 */
export function SafeCircleEditor({
  members,
  onChange,
}: {
  members: NewSafeCircleMember[];
  onChange: (members: NewSafeCircleMember[]) => void;
}) {
  const { t } = useTranslation();
  const showUndo = useUndo((s) => s.show);
  const [typing, setTyping] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const full = members.length >= SAFE_CIRCLE_MAX;

  const add = (member: NewSafeCircleMember) => {
    setNotice(null);
    if (member.phone && members.some((m) => m.phone === member.phone)) {
      setNotice(t('safeCircle.already', { name: member.name }));
      return;
    }
    onChange([...members, member].slice(0, SAFE_CIRCLE_MAX));
  };

  const fromContacts = async () => {
    try {
      const picked = await pickContact();
      if (picked === 'denied') {
        setNotice(t('safeCircle.contactsDenied'));
        setTyping(true);
      } else if (picked !== 'cancelled') {
        add({
          name: picked.name || t('safeCircle.noName'),
          phone: picked.phone ? normalisePhone(picked.phone) : null,
          is_family: false,
        });
      }
    } catch {
      // No picker on this phone: typing it in always works.
      setTyping(true);
    }
  };

  const addTyped = () => {
    if (!isSingaporeMobile(phone)) {
      setPhoneError(t('onboarding.signIn.phoneInvalid'));
      return;
    }
    add({ name: name.trim(), phone: normalisePhone(phone), is_family: false });
    setName('');
    setPhone('');
    setTyping(false);
  };

  const remove = (index: number) => {
    const removed = members[index]!;
    const before = members;
    onChange(members.filter((_, i) => i !== index));
    showUndo(t('safeCircle.removed', { name: removed.name }), () => onChange(before));
  };

  return (
    <View style={styles.wrap}>
      {members.map((m, i) => (
        <Card key={`${m.phone ?? m.name}-${i}`} testID={`safe-circle-${i}`}>
          <View style={styles.person}>
            <Avatar name={m.name} />
            <View style={styles.flex}>
              <Text variant="bodyStrong">{m.name}</Text>
              {m.phone ? <Text color="textSecondary">{m.phone}</Text> : null}
            </View>
          </View>
          <View style={styles.actions}>
            <Chip
              label={t('safeCircle.family')}
              selected={m.is_family}
              onPress={() =>
                onChange(members.map((x, j) => (j === i ? { ...x, is_family: !x.is_family } : x)))
              }
              testID={`safe-circle-${i}-family`}
            />
            <BigButton
              variant="outline"
              icon={TrashIcon}
              label={t('safeCircle.remove')}
              fullWidth={false}
              labelVariant="bodyStrong"
              onPress={() => remove(i)}
              testID={`safe-circle-${i}-remove`}
            />
          </View>
        </Card>
      ))}

      {notice ? <StatusBanner tone="notice" text={notice} /> : null}

      {full ? (
        <StatusBanner text={t('safeCircle.full', { count: SAFE_CIRCLE_MAX })} />
      ) : typing ? (
        <Card tone="subtle">
          <TextField
            label={t('safeCircle.nameLabel')}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            testID="safe-circle-name"
          />
          <TextField
            label={t('safeCircle.phoneLabel')}
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setPhoneError(null);
            }}
            keyboardType="phone-pad"
            error={phoneError}
            testID="safe-circle-phone"
          />
          <BigButton
            icon={PlusIcon}
            label={t('safeCircle.add')}
            disabled={!name.trim() || !phone.trim()}
            onPress={addTyped}
            testID="safe-circle-add-typed"
          />
        </Card>
      ) : (
        <>
          <BigButton
            icon={AddressBookIcon}
            label={t('safeCircle.fromContacts')}
            onPress={() => void fromContacts()}
            testID="safe-circle-contacts"
          />
          <BigButton
            variant="outline"
            icon={PlusIcon}
            label={t('safeCircle.typeIt')}
            onPress={() => setTyping(true)}
            testID="safe-circle-type"
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  flex: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    alignItems: 'center',
  },
});
