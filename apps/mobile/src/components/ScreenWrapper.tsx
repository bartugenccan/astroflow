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

/**
 * Set by a navigator that paints ONE shared star field behind all of its
 * screens (the tab navigator). Screens under it stay transparent: a single
 * Skia canvas never has to re-mount on a tab switch, which is what left tabs
 * black until the canvas redrew.
 */
export const BackgroundProvided = React.createContext(false);

/** Universal page frame: night-sky background + safe area. */
export function ScreenWrapper({
  children,
  variant = "default",
  edges = ["top"],
}: ScreenWrapperProps) {
  // Nested: the outer wrapper already owns the star field and the safe-area
  // inset. Painting a second Skia background would cost real frames, and
  // insetting twice would push the content down by the notch a second time.
  const inside = React.useContext(InsideScreen);
  const shared = React.useContext(BackgroundProvided);
  if (inside) return <>{children}</>;

  return (
    <InsideScreen.Provider value={true}>
      <View style={shared ? styles.rootClear : styles.root}>
        {shared ? null : <CelestialBackground variant={variant} />}
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
  rootClear: {
    flex: 1,
    backgroundColor: "transparent",
  },
  safe: {
    flex: 1,
  },
});
