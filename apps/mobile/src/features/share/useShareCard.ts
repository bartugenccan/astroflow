import { useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { CARD_W, CARD_H } from "./ShareableCard";

export type ShareStatus = "idle" | "capturing" | "sharing" | "error" | "unavailable";

/**
 * Captures the referenced off-screen card at 3× (→ 1080×1920 PNG) and opens the
 * OS share sheet. The ref must point at a mounted, laid-out ShareableCard.
 */
export function useShareCard() {
  const ref = useRef<View>(null);
  const [status, setStatus] = useState<ShareStatus>("idle");

  const share = useCallback(async () => {
    if (!ref.current) return;
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        setStatus("unavailable");
        return;
      }
      setStatus("capturing");
      const uri = await captureRef(ref, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        width: CARD_W * 3,
        height: CARD_H * 3,
      });
      setStatus("sharing");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        UTI: "public.png",
        dialogTitle: "AstroFlow",
      });
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, []);

  return { ref, share, status };
}
