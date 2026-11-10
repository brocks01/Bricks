import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReadOut, type ReadOutScript } from '@/features/readout/ReadOutProvider';
import { borderWidth, color, screenPadding, space } from '@/theme';

import { Text } from '../primitives/Text';

import { UndoHost } from '../UndoHost';

import { BackButton } from './BackButton';
import { TopBar } from './TopBar';

export interface ScreenProps {
  /** Screen title (28pt). Omit only when the body has its own large heading. */
  title?: string;
  /** What Read It Out says: where you are → main content → what you can do. */
  readOut?: ReadOutScript;
  /** 'auto' shows Back whenever this screen isn't the first in its stack. */
  back?: 'auto' | boolean;
  onBack?: () => void;
  showHelp?: boolean;
  /** Fixed area at the bottom for the one primary action ("Next", "I'm going"). */
  footer?: ReactNode;
  /** Set false for screens that manage their own scrolling (maps, lists). */
  scroll?: boolean;
  /** True when no tab bar sits below, so the footer must clear the home indicator. */
  standalone?: boolean;
  children: ReactNode;
  testID?: string;
}

/**
 * Every screen is built on this frame so the fixed controls never move:
 *
 *   [ Read it out ]                    [ Help ]     ← TopBar, always
 *   ‹ Back                                          ← only off a stack root
 *   Title
 *   …content…
 *   [ Primary action ]                              ← optional footer
 */
export function Screen({
  title,
  readOut,
  back = 'auto',
  onBack,
  showHelp = true,
  footer,
  scroll = true,
  standalone = false,
  children,
  testID,
}: ScreenProps) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { stop } = useReadOut();
  const showBack = back === 'auto' ? (navigation.getState()?.index ?? 0) > 0 : back;

  // Leaving a screen stops it being read out.
  useFocusEffect(useCallback(() => stop, [stop]));

  const body = (
    <>
      {showBack ? <BackButton onPress={onBack} /> : null}
      {title ? (
        <Text variant="title" style={styles.title}>
          {title}
        </Text>
      ) : null}
      {children}
    </>
  );

  return (
    <SafeAreaView
      style={styles.root}
      edges={standalone ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
      testID={testID}
    >
      {/* Read it out never disappears: without a script it reads the title. */}
      <TopBar readOut={readOut ?? title ?? t('common.loading')} showHelp={showHelp} />
      <View style={styles.flex}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.content]}>{body}</View>
        )}
        {/* Floats above the footer / tab bar, on the focused screen only. */}
        <UndoHost />
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingBottom: space.xl,
    gap: space.sm,
  },
  title: {
    marginTop: space.xs,
  },
  footer: {
    paddingHorizontal: screenPadding,
    paddingVertical: space.sm,
    gap: space.sm,
    borderTopWidth: borderWidth.hairline,
    borderTopColor: color.border,
    backgroundColor: color.bg,
  },
});
