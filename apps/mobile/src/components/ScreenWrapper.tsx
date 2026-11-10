import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { useIsFocused } from "expo-router";
import { CelestialBackground } from "./CelestialBackground";
import { ScreenActiveProvider } from "./ScreenActive";
import { surface } from "../lib/design-system";

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

/**
 * Universal page frame: night-sky background + safe area. It also tells
 * everything inside whether this screen is the one on top (`useScreenActive`),
 * so looping animations can rest while the screen is covered or off-tab.
 */
export function ScreenWrapper({ children, variant = "default", edges = ["top"] }: ScreenWrapperProps) {
  // Nested: the outer wrapper already owns the star field, the safe-area
  // inset and the focus signal. Painting a second Skia background would cost
  // real frames, and insetting twice would push the content down by the notch
  // a second time.
  const inside = React.useContext(InsideScreen);
  if (inside) return <>{children}</>;
  return (
    <ScreenFrame variant={variant} edges={edges}>
      {children}
    </ScreenFrame>
  );
}

function ScreenFrame({
  children,
  variant,
  edges,
}: {
  children: React.ReactNode;
  variant: NonNullable<ScreenWrapperProps["variant"]>;
  edges: Edge[];
}) {
  const shared = React.useContext(BackgroundProvided);
  const focused = useIsFocused();

  return (
    <InsideScreen.Provider value={true}>
      <ScreenActiveProvider active={focused}>
        <View style={shared ? styles.rootClear : styles.root}>
          {/* A covered stack screen's sky holds still: only the top one twinkles. */}
          {shared ? null : <CelestialBackground variant={variant} paused={!focused} />}
          <SafeAreaView style={styles.safe} edges={edges}>
            {children}
          </SafeAreaView>
        </View>
      </ScreenActiveProvider>
    </InsideScreen.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: surface.base,
  },
  rootClear: {
    flex: 1,
    backgroundColor: "transparent",
  },
  safe: {
    flex: 1,
  },
});
