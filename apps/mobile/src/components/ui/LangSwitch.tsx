import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { AppText } from "./AppText";
import type { Locale } from "../../i18n";
import { colors, radii, spacing, motion } from "../../lib/design-system";

const OPTIONS: Locale[] = ["en", "tr"];
const LABELS: Record<Locale, string> = { en: "EN", tr: "TR" };
const TRACK_WIDTH = 108;
const THUMB_WIDTH = TRACK_WIDTH / 2;

interface Props {
  value: Locale;
  onChange: (locale: Locale) => void;
}

/** EN/TR segmented control with a sliding gold indicator. */
export function LangSwitch({ value, onChange }: Props) {
  const index = OPTIONS.indexOf(value);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(index * THUMB_WIDTH, motion.spring.snappy) }],
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.thumb, thumbStyle]} />
      {OPTIONS.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            style={styles.option}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(opt);
            }}
          >
            <AppText
              variant="label"
              color={active ? colors.text.onGold : colors.text.secondary}
            >
              {LABELS[opt]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.ink[800],
    borderWidth: 1,
    borderColor: colors.border.hairline,
    flexDirection: "row",
    padding: 2,
  },
  thumb: {
    position: "absolute",
    top: 2,
    left: 2,
    width: THUMB_WIDTH - 2,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.gold[300],
  },
  option: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
