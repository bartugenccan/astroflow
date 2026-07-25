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
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { colors, radii, spacing, motion } from "../lib/design-system";
import { useUiStore } from "../store/useUiStore";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "sparkles",
  chart: "planet",
  reading: "book",
  profile: "person",
};

/** Floating pill tab bar with a gold glow that follows the active tab. */
export function CelestialTabBar({ state, navigation }: BottomTabBarProps) {
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
  focused,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
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
          size={22}
          color={focused ? colors.gold[300] : colors.text.tertiary}
        />
      </Animated.View>
      <Animated.View style={[styles.dot, dotStyle]} />
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
    paddingHorizontal: spacing.sm,
    minWidth: 220,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,14,28,0.85)",
  },
  button: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
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
