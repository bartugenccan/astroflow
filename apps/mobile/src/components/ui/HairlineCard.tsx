import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { ChunkyCard } from "./ChunkyCard";

interface HairlineCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** Kept for API compatibility — elevated cards get the deeper slab. */
  elevated?: boolean;
}

/**
 * Legacy name kept so existing screens adopt the new look; renders a night
 * ChunkyCard. New code should use ChunkyCard directly.
 */
export function HairlineCard({ children, style, padded = true, elevated = false }: HairlineCardProps) {
  return (
    <ChunkyCard style={style} padded={padded} depth={elevated ? "lg" : "md"}>
      {children}
    </ChunkyCard>
  );
}
