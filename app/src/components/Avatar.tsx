import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { color, radius } from '@/theme';

import { Text } from './primitives/Text';

export interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: 48 | 64;
}

/** First letters of the first two words: "Raj Kumar" → "RK", "Lim" → "L". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toUpperCase();
}

/**
 * A person's photo, or their initials when there is none. Decorative: the name is
 * always written next to it, so screen readers skip the avatar itself.
 */
export function Avatar({ name, photoUrl, size = 48 }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: radius.avatar };

  if (photoUrl && !failed) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[styles.base, box]}
        contentFit="cover"
        accessible={false}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View
      style={[styles.base, styles.fallback, box]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Text variant={size === 64 ? 'heading' : 'bodyStrong'} color="primary" weight="bold">
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: color.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
