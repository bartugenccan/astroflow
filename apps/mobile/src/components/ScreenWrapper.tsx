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

/**
 * Marks that a ScreenWrapper is already painting above us, so a nested one can
 * step aside. Lets a tab compose two existing feature screens without either of
 * them needing to know it is being embedded.
 */
const InsideScreen = React.createContext(false);

/** Universal page frame: night-sky background + safe area. */
export function ScreenWrapper({
  children,
  variant = "default",
  edges = ["top"],
}: ScreenWrapperProps) {
  // Nested: the outer wrapper already owns the star field and the safe-area
  // inset. Painting a second Skia background would cost real frames, and
  // insetting twice would push the content down by the notch a second time.
  if (React.useContext(InsideScreen)) return <>{children}</>;

  return (
    <InsideScreen.Provider value={true}>
      <View style={styles.root}>
        <CelestialBackground variant={variant} />
        <SafeAreaView style={styles.safe} edges={edges}>
          {children}
        </SafeAreaView>
      </View>
    </InsideScreen.Provider>
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
