import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { avatarSize, color, radius } from '@/theme';

import { Text } from './primitives/Text';

export interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  /** 32 next to a host's name; 48 in lists; 64 in cards; 96 at the top of a profile. */
  size?: 32 | 48 | 64 | 96;
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
export function Avatar({ name, photoUrl, size = avatarSize.md }: AvatarProps) {
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
      <Text
        variant={
          size === 96 ? 'display' : size === 64 ? 'heading' : size === 32 ? 'caption' : 'bodyStrong'
        }
        color="primary"
        weight="bold"
        // Decorative (the name is written beside it): stays inside its circle at any font size.
        maxFontSizeMultiplier={size === 32 ? 1 : undefined}
      >
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
