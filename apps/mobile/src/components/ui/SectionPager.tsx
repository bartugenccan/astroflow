import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { motion } from "../../lib/design-system";

interface SectionPagerProps<T extends string> {
  /** Section keys in the order they appear in the switcher. */
  order: readonly T[];
  active: T;
  render: (key: T) => React.ReactNode;
}

const SHIFT = 24;

/**
 * Hosts the sections of a composed tab (You, Ahead). Each section is mounted
 * the first time it's shown and then kept alive, so switching back preserves
 * scroll position, open rows and loaded data instead of remounting behind a
 * loader. Switching crossfades with a short slide in the direction of travel.
 */
export function SectionPager<T extends string>({ order, active, render }: SectionPagerProps<T>) {
  const [visited, setVisited] = useState<Set<T>>(() => new Set([active]));

  useEffect(() => {
    setVisited((v) => (v.has(active) ? v : new Set(v).add(active)));
  }, [active]);

  const activeIndex = order.indexOf(active);

  return (
    <View style={styles.root}>
      {order.map((key, i) =>
        visited.has(key) ? (
          <Pane key={key} active={key === active} side={i < activeIndex ? -1 : 1}>
            {render(key)}
          </Pane>
        ) : null,
      )}
    </View>
  );
}

function Pane({
  active,
  side,
  children,
}: {
  active: boolean;
  side: -1 | 1;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const p = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    p.value = active
      ? withSpring(1, motion.spring.gentle)
      : withTiming(0, { duration: motion.duration.fast });
  }, [active, p]);

  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateX: reduced ? 0 : (1 - p.value) * SHIFT * side }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, style]}
      pointerEvents={active ? "auto" : "none"}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
