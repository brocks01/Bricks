import { StyleSheet, View } from 'react-native';

import type { PersonSummary } from '@/api/types';
import { borderWidth, color, layout, radius, space } from '@/theme';

import { Avatar } from './Avatar';
import { Text } from './primitives/Text';

const SHOWN = 5;
const OVERLAP = layout.avatarOverlap;

/**
 * "[faces] 12 people going": a few overlapping avatars and one plain sentence.
 * The sentence carries the meaning; the faces are decoration.
 */
export function PeopleRow({ people, label }: { people: PersonSummary[]; label: string }) {
  const shown = people.slice(0, SHOWN);

  return (
    <View style={styles.row} accessible accessibilityLabel={label}>
      {shown.length > 0 ? (
        <View style={styles.faces}>
          {shown.map((p, i) => (
            <View key={p.id} style={[styles.face, i > 0 && styles.overlap]}>
              <Avatar name={p.name} photoUrl={p.photo_url} />
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  faces: {
    flexDirection: 'row',
  },
  face: {
    borderRadius: radius.avatar,
    borderWidth: borderWidth.control,
    borderColor: color.bg,
  },
  overlap: {
    marginLeft: -OVERLAP,
  },
  label: {
    flexShrink: 1,
  },
});
