import type { StyleProp, ViewStyle } from "react-native";
import type { MascotMood } from "../../services/types";

/** What Aster is doing right now. */
export type AsterAction = "idle" | "cheer" | "talk" | "hatch" | "breathe" | "sleep";

/**
 * The renderer contract. Today Aster is drawn in code (react-native-svg +
 * Reanimated); a designer-made Rive/Lottie Aster can replace AsterMascot by
 * implementing these same props, without touching any screen.
 */
export interface MascotRendererProps {
  /** 0 egg · 1 Kıvılcım · 2 Yıldızcık · 3 Parıltı · 4 Takımyıldız · 5 Nova */
  stage: number;
  mood?: MascotMood;
  /** Accessory ids from the catalog (one per slot). */
  accessories?: string[];
  /** Rendered width/height in px (Aster is drawn on a square). */
  size?: number;
  action?: AsterAction;
  /** Bump to replay a one-shot action (cheer, hatch) without changing it. */
  playKey?: number;
  style?: StyleProp<ViewStyle>;
  /** Spoken description; screens pass e.g. "Aster, Yıldızcık, mutlu". */
  accessibilityLabel?: string;
}
