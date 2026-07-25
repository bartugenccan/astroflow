import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { CelestialBackground } from "./CelestialBackground";
import { colors } from "../lib/design-system";

interface ScreenWrapperProps {
  children: React.ReactNode;
  variant?: "default" | "dense" | "still";
  edges?: Edge[];
}

/** Universal page frame: night-sky background + safe area. */
export function ScreenWrapper({
  children,
  variant = "default",
  edges = ["top"],
}: ScreenWrapperProps) {
  return (
    <View style={styles.root}>
      <CelestialBackground variant={variant} />
      <SafeAreaView style={styles.safe} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ink[950],
  },
  safe: {
    flex: 1,
  },
});
