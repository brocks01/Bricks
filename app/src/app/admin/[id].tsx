import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAddOrgPeople, useOrg } from '@/api';
import type { OrgDetail, OrgPerson } from '@/api/types';
import {
  BigButton,
  BottomSheet,
  GroupedList,
  GroupedRow,
  QrCodeIcon,
  QueryState,
  Screen,
  SealCheckIcon,
  SheetHeader,
  Text,
  TextField,
  UserPlusIcon,
  WhatsappLogoIcon,
  showToast,
} from '@/components';
import { openExternal } from '@/lib/openExternal';
import { normalisePhone } from '@/lib/phone';
import { color, iconSize, screenPadding, space } from '@/theme';

/** The link inside the QR: opens this app on the join screen (any build, or Expo Go). */
export const joinLink = (code: string) => Linking.createURL(`/join/${code}`);

/** "Tan Mei Ling, 9123 4567" → { name, phone }. Lines without a name are skipped. */
export function parsePeople(text: string): OrgPerson[] {
  return text
    .split('\n')
    .map((line) => {
      const [name = '', ...rest] = line.split(',');
      const phone = rest.join(',').trim();
      return { name: name.trim(), phone: phone ? normalisePhone(phone) : null };
    })
    .filter((p) => p.name.length > 0);
}

/**
 * S11 Admin (Luma's manage guests): the organisation with its verified badge, Show
 * QR (full screen, for people to scan), the WhatsApp join link, Add people from a
 * list, and everyone's status: Needs help first, then Invited, then Joined. Names
 * and statuses only: staff never see a health card or a Safe Circle. No charts.
 */
export default function AdminScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const org = useOrg(id);
  const [showQr, setShowQr] = useState(false);
  const [adding, setAdding] = useState(false);

  const summary = (o: OrgDetail) =>
    t('admin.summary', {
      joined: o.members.filter((m) => m.status === 'joined').length,
      invited: o.members.filter((m) => m.status === 'invited').length,
      help: o.members.filter((m) => m.status === 'needs_help').length,
    });

  return (
    <Screen
      section="settings"
      title={org.data?.name ?? t('admin.members')}
      readOut={() =>
        org.data
          ? t('admin.readout', { name: org.data.name, summary: summary(org.data) })
          : t('admin.members')
      }
      scroll
      testID="screen-admin"
    >
      <QueryState query={org}>
        {(o) => (
          <>
            {o.verified ? (
              <View style={styles.verified} testID="admin-verified">
                <SealCheckIcon size={iconSize.inline} color={color.primary} weight="fill" />
                <Text variant="bodyStrong">{t('admin.verified')}</Text>
              </View>
            ) : null}
            <BigButton
              size="lg"
              icon={QrCodeIcon}
              label={t('admin.showQr')}
              onPress={() => setShowQr(true)}
              testID="admin-show-qr"
            />
            <BigButton
              variant="outline"
              icon={WhatsappLogoIcon}
              label={t('admin.shareWhatsApp')}
              onPress={() =>
                void openExternal(
                  `https://wa.me/?text=${encodeURIComponent(
                    t('admin.whatsappText', { name: o.name, link: joinLink(o.join_code) }),
                  )}`,
                )
              }
              testID="admin-share-whatsapp"
            />
            <BigButton
              variant="outline"
              icon={UserPlusIcon}
              label={t('admin.addPeople')}
              onPress={() => setAdding(true)}
              testID="admin-add-people"
            />

            <Text color="textSecondary" testID="admin-summary">
              {summary(o)}
            </Text>
            <GroupedList title={t('admin.members')} testID="admin-members">
              {o.members.length === 0 ? (
                <GroupedRow title={t('admin.none')} />
              ) : (
                o.members.map((m) => (
                  <GroupedRow
                    key={m.id}
                    title={m.name}
                    value={t(`admin.status.${m.status}`)}
                    testID={`admin-member-${m.id}`}
                  />
                ))
              )}
            </GroupedList>

            <QrScreen org={o} visible={showQr} onClose={() => setShowQr(false)} />
            <AddPeopleSheet orgId={o.id} visible={adding} onClose={() => setAdding(false)} />
          </>
        )}
      </QueryState>
    </Screen>
  );
}

/** Full screen, as big as the phone allows, for a room of people to scan. */
function QrScreen({
  org,
  visible,
  onClose,
}: {
  org: OrgDetail;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.qrScreen} testID="admin-qr">
        <Text variant="title" align="center">
          {t('admin.qrTitle', { name: org.name })}
        </Text>
        <View
          style={styles.qr}
          accessible
          accessibilityLabel={t('admin.qrTitle', { name: org.name })}
        >
          <QRCode value={joinLink(org.join_code)} size={QR_SIZE} quietZone={space.sm} />
        </View>
        <Text align="center">{t('admin.qrHint', { code: org.join_code })}</Text>
        <Text variant="display" align="center" testID="admin-qr-code">
          {org.join_code}
        </Text>
        <BigButton label={t('admin.close')} onPress={onClose} testID="admin-qr-close" />
      </SafeAreaView>
    </Modal>
  );
}

/** Upload a list: type or paste it, one person per line. */
function AddPeopleSheet({
  orgId,
  visible,
  onClose,
}: {
  orgId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const add = useAddOrgPeople(orgId);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setText('');
    setError(null);
    onClose();
  };
  const submit = () => {
    const people = parsePeople(text);
    if (people.length === 0) return setError(t('admin.listEmpty'));
    add.mutate(people, {
      onSuccess: () => {
        close();
        showToast(t('admin.added', { count: people.length }));
      },
    });
  };

  return (
    <BottomSheet visible={visible} onRequestClose={close} testID="admin-add-sheet">
      <SheetHeader icon={UserPlusIcon} title={t('admin.addPeople')} />
      <View style={styles.sheet}>
        <TextField
          label={t('admin.listLabel')}
          hint={t('admin.listHint')}
          value={text}
          onChangeText={(value) => {
            setText(value);
            setError(null);
          }}
          multiline
          error={error}
          testID="admin-add-field"
        />
        <BigButton
          label={t('admin.add')}
          disabled={add.isPending}
          onPress={submit}
          testID="admin-add-submit"
        />
        <BigButton variant="outline" label={t('walkFeed.cancel')} onPress={close} />
      </View>
    </BottomSheet>
  );
}

const QR_SIZE = 260;

const styles = StyleSheet.create({
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  qrScreen: {
    flex: 1,
    backgroundColor: color.bg,
    padding: screenPadding,
    gap: space.md,
    justifyContent: 'center',
  },
  qr: {
    alignSelf: 'center',
    backgroundColor: color.bg,
  },
  sheet: {
    gap: space.sm,
  },
});
