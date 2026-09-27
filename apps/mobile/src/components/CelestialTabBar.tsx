import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import type { Tabs } from "expo-router";

/**
 * SDK 57 vendored react-navigation inside expo-router, so the standalone
 * `@react-navigation/bottom-tabs` types no longer match what `<Tabs>` hands its
 * `tabBar` prop. Derive the type from the component itself: it tracks whichever
 * copy expo-router uses, without importing one of its internal build paths.
 */
type BottomTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];
import { colors, radii, spacing, motion } from "../lib/design-system";
import { useUiStore } from "../store/useUiStore";
import { useTranslation, TranslationKey } from "../i18n";
import { AppText } from "./ui/AppText";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "moon",
  you: "planet",
  ahead: "telescope",
  profile: "person-circle",
};

/** i18n key per route, so the bar can name its destinations. */
const LABELS: Record<string, TranslationKey> = {
  index: "tabs.today",
  you: "tabs.you",
  ahead: "tabs.ahead",
  profile: "tabs.profile",
};

/** Floating pill tab bar with a gold glow that follows the active tab. */
export function CelestialTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const sheetOpen = useUiStore((s) => s.sheetOpen);
  const hidden = useSharedValue(0);

  React.useEffect(() => {
    // Slide down + fade out while a bottom sheet is open so it never covers the
    // sheet's content; spring back when the sheet closes.
    hidden.value = withSpring(sheetOpen ? 1 : 0, motion.spring.gentle);
  }, [sheetOpen, hidden]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: 1 - hidden.value,
    transform: [{ translateY: hidden.value * 140 }],
  }));

  return (
    <Animated.View
      pointerEvents={sheetOpen ? "none" : "auto"}
      style={[styles.wrap, { paddingBottom: insets.bottom + spacing.md }, wrapStyle]}
    >
      <View style={styles.pill}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.overlay} />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const onPress = () => {
            Haptics.selectionAsync();
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          return (
            <TabButton
              key={route.key}
              icon={ICONS[route.name] ?? "ellipse"}
              label={LABELS[route.name] ? t(LABELS[route.name]) : undefined}
              focused={focused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

function TabButton({
  icon,
  label,
  focused,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  /** Named destinations: an icon alone asks the user to decode it. */
  label?: string;
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(focused ? 1.08 : 1);
  const glow = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.08 : 1, motion.spring.snappy);
    glow.value = withTiming(focused ? 1 : 0, { duration: motion.duration.base });
  }, [focused, scale, glow]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: glow.value }],
  }));

  return (
    <Pressable onPress={onPress} style={styles.button} hitSlop={12}>
      <Animated.View style={[styles.glow, glowStyle]} />
      <Animated.View style={iconStyle}>
        <Ionicons
          name={icon}
          size={20}
          color={focused ? colors.gold[300] : colors.text.tertiary}
        />
      </Animated.View>
      {label ? (
        <AppText
          variant="label"
          color={focused ? colors.gold[300] : colors.text.tertiary}
          numberOfLines={1}
          style={styles.label}
        >
          {label}
        </AppText>
      ) : (
        <Animated.View style={[styles.dot, dotStyle]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
  },
  pill: {
    flexDirection: "row",
    height: 64,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    overflow: "hidden",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    // Fill the row (minus the side gutters) instead of a fixed minimum that
    // overflowed on 320pt-wide phones.
    width: "100%",
    maxWidth: 420,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(10,14,28,0.85)",
  },
  button: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  label: {
    // The pill is tight; keep the label from forcing the icons apart.
    fontSize: 9,
    letterSpacing: 0.6,
  },
  glow: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.glow.goldSoft,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gold[300],
    position: "absolute",
    bottom: 8,
  },
});
