import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReadOutBar } from '@/features/readout/ReadOutBar';
import { useReadOut, type ReadOutScript } from '@/features/readout/ReadOutProvider';
import { useBuddy } from '@/state/buddy';
import { useSettings } from '@/state/settings';
import { borderWidth, color, screenPadding, space } from '@/theme';

import { Text } from '../primitives/Text';

import { TellMeButton } from '../TellMeButton';
import { UndoHost } from '../UndoHost';

import { BackButton } from './BackButton';
import { TopBar } from './TopBar';

/** Lets the screen settle (and its data arrive) before reading it automatically. */
const AUTO_READ_DELAY_MS = 600;

export interface ScreenProps {
  /** Screen title (28pt). Omit only when the body has its own large heading. */
  title?: string;
  /** What Read It Out says: where you are → main content → what you can do. */
  readOut?: ReadOutScript;
  /** Read the screen out as soon as it opens, whatever the setting (SOS). */
  readOnOpen?: boolean;
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
  /**
   * Shows Tell me (Buddy) at the bottom. On by default where the screen has no
   * primary action of its own; off during onboarding and on SOS.
   */
  tellMe?: boolean;
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
  readOnOpen = false,
  back = 'auto',
  onBack,
  showHelp = true,
  footer,
  scroll = true,
  standalone = false,
  tellMe,
  children,
  testID,
}: ScreenProps) {
  const openBuddy = useBuddy((s) => s.open);
  const buddyListening = useBuddy((s) => s.listening);
  const showTellMe = tellMe ?? (!footer && !standalone && showHelp);
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { speak, stop } = useReadOut();
  const owner = useId();
  const autoRead = useSettings((s) => s.readOut.autoRead);
  const showBack = back === 'auto' ? (navigation.getState()?.index ?? 0) > 0 : back;
  const script = readOut ?? title ?? t('common.loading');

  // Read the screen when it opens if they asked for that (Settings → Read aloud).
  // Leaving a screen always stops it being read out.
  useFocusEffect(
    useCallback(() => {
      if (readOnOpen) speak(script, owner);
      const timer =
        autoRead && !readOnOpen ? setTimeout(() => speak(script, owner), AUTO_READ_DELAY_MS) : null;
      return () => {
        if (timer) clearTimeout(timer);
        stop(owner);
      };
      // Only on focus: a script that changes as data loads must not restart reading.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoRead, readOnOpen, owner, speak, stop]),
  );

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
      <TopBar readOut={script} showHelp={showHelp} owner={owner} />
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
      <ReadOutBar />
      {showTellMe ? (
        <View style={styles.tellMe}>
          <TellMeButton onPress={openBuddy} listening={buddyListening} testID="tellme" />
        </View>
      ) : null}
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
  tellMe: {
    paddingVertical: space.xs,
    borderTopWidth: borderWidth.hairline,
    borderTopColor: color.border,
    backgroundColor: color.bg,
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
