import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReadOutBar } from '@/features/readout/ReadOutBar';
import { useReadOut, type ReadOutScript } from '@/features/readout/ReadOutProvider';
import { config } from '@/lib/config';
import { useIsOffline } from '@/lib/online';
import { useBuddy } from '@/state/buddy';
import { useSettings } from '@/state/settings';
import {
  borderWidth,
  color,
  screenPadding,
  sectionColor,
  space,
  type SectionColorKey,
} from '@/theme';
import { useCompact } from '@/theme/TypographyProvider';

import { Text } from '../primitives/Text';

import {
  BUDDY_BUTTON_CLEARANCE,
  BUDDY_BUTTON_CLEARANCE_COMPACT,
  BuddyButton,
} from '../BuddyButton';
import { StatusBanner } from '../StatusBanner';
import { TintBackdrop } from '../TintBackdrop';
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
   * Shows Buddy, the round voice button in the bottom-right corner. On by default
   * on every screen except the safety screens (where Help is hidden: SOS, Are you
   * OK?, helper alert). Off while the screen itself is recording audio.
   */
  tellMe?: boolean;
  /** A colour at the top fading to the page grey (the event page's cover tint, Luma). */
  tint?: string;
  /** The part of the app this page belongs to: its soft colour washes the top. */
  section?: SectionColorKey;
  /** A deep colour behind the top of the page, fading into `tint` (event page). */
  tintStrong?: string;
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
  tint,
  tintStrong,
  section,
  children,
  testID,
}: ScreenProps) {
  const pageTint = tint ?? (section ? sectionColor[section].bg : undefined);
  const offline = useIsOffline();
  const compact = useCompact();
  const openBuddy = useBuddy((s) => s.open);
  const buddyListening = useBuddy((s) => s.listening);
  const showBuddy = tellMe ?? showHelp;
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

  const strongBand = tint && tintStrong ? tintStrong : undefined;
  const body = (
    <>
      {strongBand && tint ? <TintBackdrop tint={tint} strong={strongBand} /> : null}
      {/* Mock data works offline, so the banner only shows on the real API. */}
      {offline && !config.demoVoice ? (
        <StatusBanner tone="notice" text={t('common.offline')} testID="offline-banner" />
      ) : null}
      {compact && showBack && title ? (
        // Small and Normal text: Back and the title share one line.
        <View style={styles.backRow}>
          <BackButton onPress={onBack} />
          <Text variant="title" style={styles.backTitle}>
            {title}
          </Text>
        </View>
      ) : (
        <>
          {showBack ? <BackButton onPress={onBack} /> : null}
          {title ? (
            <Text variant="title" style={compact ? null : styles.title}>
              {title}
            </Text>
          ) : null}
        </>
      )}
      {children}
    </>
  );

  return (
    <SafeAreaView
      style={[styles.root, strongBand ? { backgroundColor: strongBand } : null]}
      edges={standalone ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
      testID={testID}
    >
      {pageTint && !strongBand ? <TintBackdrop tint={pageTint} /> : null}
      {/* Read it out never disappears: without a script it reads the title. */}
      <TopBar readOut={script} showHelp={showHelp} owner={owner} />
      <View style={styles.flex}>
        {scroll ? (
          <ScrollView
            style={[styles.flex, strongBand ? styles.canvas : null]}
            contentContainerStyle={[
              styles.content,
              compact && styles.compact,
              showBuddy && (compact ? styles.buddyRoomCompact : styles.buddyRoom),
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.content, compact && styles.compact]}>{body}</View>
        )}
        {/* Floats above the footer / tab bar, on the focused screen only. */}
        <UndoHost />
        {showBuddy ? (
          <View style={styles.buddy} pointerEvents="box-none">
            <BuddyButton onPress={openBuddy} listening={buddyListening} testID="tellme" />
          </View>
        ) : null}
      </View>
      <ReadOutBar />
      {footer ? (
        <View style={[styles.footer, compact && styles.footerCompact]}>{footer}</View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.canvas,
  },
  flex: {
    flex: 1,
  },
  canvas: {
    backgroundColor: color.canvas,
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingBottom: space.xl,
    gap: space.sm,
  },
  title: {
    marginTop: space.xs,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  backTitle: {
    flexShrink: 1,
  },
  // Small and Normal text: tighter rhythm so more fits on one screen.
  compact: {
    paddingBottom: space.sm,
    gap: space.xs + space.xxs,
  },
  // The last item can always scroll clear of the round Buddy button.
  buddyRoom: {
    paddingBottom: BUDDY_BUTTON_CLEARANCE,
  },
  buddyRoomCompact: {
    paddingBottom: BUDDY_BUTTON_CLEARANCE_COMPACT,
  },
  buddy: {
    position: 'absolute',
    right: screenPadding,
    bottom: space.sm,
  },
  footer: {
    paddingHorizontal: screenPadding,
    paddingVertical: space.sm,
    gap: space.sm,
    borderTopWidth: borderWidth.hairline,
    borderTopColor: color.border,
    backgroundColor: color.canvas,
  },
  footerCompact: {
    paddingVertical: space.xs + space.xxs,
    gap: space.xs + space.xxs,
  },
});
