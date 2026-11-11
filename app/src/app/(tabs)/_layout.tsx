import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions } from 'react-native';
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

export const unstable_settings = {
  anchor: 'home',
};

/**
 * Room for the icon plus two lines of label at the phone's font size (labels like
 * "Pass It On" and most Tamil labels wrap on narrow phones). Grows with the system
 * font up to the chrome cap, so labels are never clipped.
 */
function tabBarHeight(fontScale: number): number {
  const scale = Math.min(Math.max(fontScale, 1), maxChromeFontScale);
  const labelLine = typeScale.caption.size * lineHeightRatio * scale;
  const content = space.xs * 2 + iconSize.inline + space.xxs + labelLine * 2;
  return Math.max(touch.large, Math.ceil(content));
}

function tabIcon(IconComponent: Icon) {
  return function TabIcon({ focused }: { focused: boolean }) {
    // Filled when selected, so the active tab isn't shown by colour alone.
    return (
      <IconComponent
        size={iconSize.inline}
        color={focused ? color.primary : color.textSecondary}
        weight={focused ? 'fill' : 'bold'}
      />
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
        color={focused ? 'primary' : 'textSecondary'}
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
 * Home · Community · Activity · Health (routes kampung, pass-it-on, thrive). Home is
 * first and the default; the three pillars follow in the same order as the cards on Home.
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
        tabBarActiveTintColor: color.primary,
        tabBarInactiveTintColor: color.textSecondary,
        tabBarActiveBackgroundColor: color.primarySubtle,
        // Luma: a white pill floating above the content, clear of the home indicator.
        tabBarStyle: {
          height: tabBarHeight(fontScale) + space.xs * 2,
          marginHorizontal: space.sm,
          marginBottom: insets.bottom + space.xs,
          paddingTop: space.xs,
          paddingBottom: space.xs,
          paddingHorizontal: space.xs,
          borderRadius: radius.button,
          borderTopWidth: 0,
          backgroundColor: color.bg,
          ...shadow.floating,
        },
        tabBarItemStyle: styles.item,
        sceneStyle: { backgroundColor: color.bg },
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
  // The selected tab sits in its own grey pill.
  item: {
    minHeight: touch.large,
    paddingVertical: space.xxs,
    gap: space.xxs,
    marginHorizontal: space.xxs,
    borderRadius: radius.button,
    overflow: 'hidden',
  },
});
