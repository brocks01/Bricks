import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
  touch,
  typeScale,
} from '@/theme';

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
function tabBarHeight(fontScale: number, labels: readonly string[]): number {
  const scale = Math.min(Math.max(fontScale, 1), maxChromeFontScale);
  const labelLine = typeScale.caption.size * lineHeightRatio * scale;
  const lines = labels.some((l) => /\s/.test(l.trim())) ? 2 : 1;
  const content = space.xs * 2 + iconSize.inline + space.xxs * 3 + labelLine * lines;
  return Math.max(touch.large, Math.ceil(content));
}

function tabIcon(IconComponent: Icon) {
  return function TabIcon({ focused }: { focused: boolean }) {
    // Selected: a filled icon on a grey pill, and a bold label, so the active tab
    // isn't shown by colour alone.
    return (
      <View style={[styles.iconPill, focused && styles.iconPillOn]}>
        <IconComponent
          size={iconSize.inline}
          color={focused ? color.text : color.textSecondary}
          weight={focused ? 'fill' : 'bold'}
        />
      </View>
    );
  };
}

function tabLabel(label: string) {
  // A one-word label ("Kampung") stays on one line and shrinks a little to fit, so it
  // never breaks mid-word ("Kampun / g") at a large phone font. Longer labels wrap
  // between words.
  const oneWord = !/\s/.test(label.trim());
  return function TabLabel({ focused }: { focused: boolean }) {
    return (
      <Text
        variant="caption"
        weight={focused ? 'bold' : 'regular'}
        color={focused ? 'text' : 'textSecondary'}
        align="center"
        numberOfLines={oneWord ? 1 : 2}
        adjustsFontSizeToFit={oneWord}
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

  return (
    <Tabs
      // Android Back from any tab returns to Home (the anchor), never out of the app.
      backBehavior="initialRoute"
      screenListeners={{ tabPress: () => tapFeedback() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.text,
        tabBarInactiveTintColor: color.textSecondary,
        tabBarStyle: {
          ...shadow.floating,
          height:
            tabBarHeight(fontScale, [
              t('tabs.home'),
              t('tabs.kampung'),
              t('tabs.passItOn'),
              t('tabs.thrive'),
            ]) +
            space.xs * 2,
          marginHorizontal: space.sm,
          marginBottom: insets.bottom + space.xs,
          paddingHorizontal: space.xxs,
          paddingTop: space.xs,
          paddingBottom: space.xs,
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
          tabBarIcon: tabIcon(HouseIcon),
          tabBarLabel: tabLabel(t('tabs.home')),
          tabBarButtonTestID: 'tab-home',
        }}
      />
      <Tabs.Screen
        name="kampung"
        options={{
          title: t('tabs.kampung'),
          tabBarIcon: tabIcon(UsersThreeIcon),
          tabBarLabel: tabLabel(t('tabs.kampung')),
          tabBarButtonTestID: 'tab-kampung',
        }}
      />
      <Tabs.Screen
        name="pass-it-on"
        options={{
          title: t('tabs.passItOn'),
          tabBarIcon: tabIcon(HandHeartIcon),
          tabBarLabel: tabLabel(t('tabs.passItOn')),
          tabBarButtonTestID: 'tab-pass-it-on',
        }}
      />
      <Tabs.Screen
        name="thrive"
        options={{
          title: t('tabs.thrive'),
          tabBarIcon: tabIcon(HeartbeatIcon),
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
  iconPillOn: {
    backgroundColor: color.primarySubtle,
  },
});
