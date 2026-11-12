import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useMe } from '@/api';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  HandHeartIcon,
  HeartbeatIcon,
  HouseIcon,
  Text,
  UsersThreeIcon,
  type Icon,
} from '@/components';
import { tapFeedback } from '@/lib/haptics';
import {
  color,
  iconSize,
  lineHeightRatio,
  maxChromeFontScale,
  radius,
  shadow,
  space,
  sectionColor,
  touch,
  typeScale,
  type SectionColorKey,
} from '@/theme';
import { useTypography } from '@/theme/TypographyProvider';

const ICON_PILL_WIDTH = 64;

export const unstable_settings = {
  anchor: 'home',
};

/**
 * Room for the icon plus the labels at the phone's font size: two lines when a label
 * has more than one word (those wrap on narrow phones, e.g. "Aktiviti Saya" and most
 * Tamil labels), one line otherwise (one-word labels shrink to fit instead). Grows
 * with the system font up to the chrome cap, so labels are never clipped.
 */
function tabBarHeight(fontScale: number, textSize: number, labels: readonly string[]): number {
  const scale = Math.min(Math.max(fontScale, 1), maxChromeFontScale) * textSize;
  const labelLine = typeScale.caption.size * lineHeightRatio * scale;
  const lines = labels.some((l) => /\s/.test(l.trim())) ? 2 : 1;
  // Small and Normal text: tighter padding around the icon and label.
  const padding = textSize < 1 ? space.xxs * 2 : space.xs * 2 + space.xxs;
  const content = padding + iconSize.inline + space.xxs * 2 + labelLine * lines;
  return Math.max(textSize < 1 ? touch.compact : touch.large, Math.ceil(content));
}

function tabIcon(IconComponent: Icon, section: SectionColorKey) {
  const tint = sectionColor[section];
  return function TabIcon({ focused }: { focused: boolean }) {
    // Selected: a filled icon on a pill in the section's colour, and a bold label,
    // so the active tab isn't shown by colour alone.
    return (
      <View style={[styles.iconPill, focused && { backgroundColor: tint.bg }]}>
        <IconComponent
          size={iconSize.inline}
          color={focused ? tint.fg : color.textSecondary}
          weight={focused ? 'fill' : 'bold'}
        />
      </View>
    );
  };
}

function tabLabel(label: string) {
  // A one-word label ("Kampung") stays on one line, so it never breaks mid-word
  // ("Kampun / g"). Longer labels wrap between words. Either way it shrinks a little
  // to fit rather than being cut off with "…".
  const oneWord = !/\s/.test(label.trim());
  return function TabLabel({ focused }: { focused: boolean }) {
    return (
      <Text
        variant="caption"
        weight={focused ? 'bold' : 'regular'}
        color={focused ? 'text' : 'textSecondary'}
        align="center"
        numberOfLines={oneWord ? 1 : 2}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        maxFontSizeMultiplier={maxChromeFontScale}
      >
        {label}
      </Text>
    );
  };
}

/**
 * Home · Community · Activity · Health, on a floating white pill with the selected
 * tab's icon in a grey pill (Luma). Home is first and the default; the three pillars follow
 * in the same order as the cards on Home. The bar stays in the layout (it doesn't
 * overlap the screen), so footers and the last list item are never hidden under it.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const { fontScale: textSize } = useTypography();
  // Simple Mode (S13): Home's three buttons are the whole app, so no tab bar.
  const simple = useMe().data?.simple_mode ?? false;

  return (
    <Tabs
      // Android Back from any tab returns to Home (the anchor), never out of the app.
      backBehavior="initialRoute"
      screenListeners={{ tabPress: () => tapFeedback() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.text,
        tabBarInactiveTintColor: color.textSecondary,
        tabBarStyle: simple
          ? { display: 'none' }
          : {
              ...shadow.floating,
              height:
                tabBarHeight(fontScale, textSize, [
                  t('tabs.home'),
                  t('tabs.kampung'),
                  t('tabs.passItOn'),
                  t('tabs.thrive'),
                ]) + (textSize < 1 ? space.xxs * 2 : space.xs * 2),
              marginHorizontal: space.sm,
              marginBottom: insets.bottom + space.xs,
              paddingHorizontal: space.xxs,
              paddingTop: textSize < 1 ? space.xxs : space.xs,
              paddingBottom: textSize < 1 ? space.xxs : space.xs,
              borderTopWidth: 0,
              borderRadius: radius.button,
              backgroundColor: color.bg,
            },
        tabBarItemStyle: styles.item,
        sceneStyle: { backgroundColor: color.canvas },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          tabBarIcon: tabIcon(HouseIcon, 'home'),
          tabBarLabel: tabLabel(t('tabs.home')),
          tabBarButtonTestID: 'tab-home',
        }}
      />
      <Tabs.Screen
        name="kampung"
        options={{
          title: t('tabs.kampung'),
          tabBarIcon: tabIcon(UsersThreeIcon, 'community'),
          tabBarLabel: tabLabel(t('tabs.kampung')),
          tabBarButtonTestID: 'tab-kampung',
        }}
      />
      <Tabs.Screen
        name="pass-it-on"
        options={{
          title: t('tabs.passItOn'),
          tabBarIcon: tabIcon(HandHeartIcon, 'activity'),
          tabBarLabel: tabLabel(t('tabs.passItOn')),
          tabBarButtonTestID: 'tab-pass-it-on',
        }}
      />
      <Tabs.Screen
        name="thrive"
        options={{
          title: t('tabs.thrive'),
          tabBarIcon: tabIcon(HeartbeatIcon, 'health'),
          tabBarLabel: tabLabel(t('tabs.thrive')),
          tabBarButtonTestID: 'tab-thrive',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  item: {
    minHeight: touch.min,
    paddingVertical: space.xxs,
    gap: space.xxs,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  iconPill: {
    width: ICON_PILL_WIDTH,
    paddingVertical: space.xxs,
    alignItems: 'center',
    borderRadius: radius.button,
  },
});
