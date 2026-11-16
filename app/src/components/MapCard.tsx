import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { mapImageUrl, openInMapsUrl } from '../api/geo';
import '../features/connect/revampWords'; // registers the words
import { useT } from '../i18n';
import { colors, radius, space } from '../theme/tokens';

/**
 * Where a community meets or an event takes place: the address in words, a map picture drawn by the server (hidden if there is none, so never a
 * broken image), and a big "Open in Google Maps" button. Works on the website and on phones; no map library, and the app never holds a Maps key.
 */
export function MapCard({ kind, id, address, title }: { kind: 'community' | 'event'; id: string; address: string; title?: string }) {
  const t = useT();
  const [picture, setPicture] = useState(true);
  if (!address.trim()) return null;
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md }}>
      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700', color: colors.ink }}>{title ?? t('rv.where')}</Text>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
        <Ionicons name="location" size={24} color={colors.accent} style={{ marginTop: 2 }} />
        <Text style={{ flex: 1, fontSize: 18, lineHeight: 26, color: colors.ink }}>{address}</Text>
      </View>
      {picture ? (
        <Image
          source={{ uri: mapImageUrl(kind, id) }}
          onError={() => setPicture(false)}
          accessibilityLabel={t('rv.map_of', { place: address })}
          style={{ width: '100%', aspectRatio: 2, borderRadius: radius.button, backgroundColor: colors.bone }}
          resizeMode="cover"
        />
      ) : null}
      <Pressable
        onPress={() => void Linking.openURL(openInMapsUrl(address))}
        accessibilityRole="link"
        accessibilityLabel={t('rv.open_maps')}
        style={({ pressed }) => ({ minHeight: 56, borderRadius: radius.button, borderWidth: 2, borderColor: colors.navy, backgroundColor: pressed ? colors.navySoft : colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.lg })}
      >
        <Ionicons name="map-outline" size={24} color={colors.navy} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.navy }}>{t('rv.open_maps')}</Text>
      </Pressable>
    </View>
  );
}
