import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { AppText } from "../../components/ui/AppText";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { StateView } from "../../components/ui/StateView";
import { Ionicons } from "@expo/vector-icons";
import { ShareableCard, ShareCardData, CARD_W, CARD_H } from "./ShareableCard";
import { useShareCard } from "./useShareCard";
import { useTranslation } from "../../i18n";
import { EnterView } from "../../lib/motion";
import { colors, depth, palette, spacing, radii, surface } from "../../lib/design-system";

interface ShareCardModalProps {
  visible: boolean;
  onClose: () => void;
  data: ShareCardData | null;
}

const SCREEN_W = Dimensions.get("window").width;
// Preview fits within the sheet content width.
const PREVIEW_W = Math.min(SCREEN_W - spacing.xl * 2, 260);
const SCALE = PREVIEW_W / CARD_W;
const PREVIEW_H = CARD_H * SCALE;

/**
 * Renders the full-res card OFF-SCREEN (for capture) plus a scaled preview in a
 * bottom sheet with a Share button. The off-screen node is what captureRef
 * rasterizes; the preview is purely visual.
 */
export function ShareCardModal({ visible, onClose, data }: ShareCardModalProps) {
  const { t } = useTranslation();
  const { ref, share, status } = useShareCard();

  if (!visible || !data) return null;

  const busy = status === "capturing" || status === "sharing";

  return (
    <>
      {/* Off-screen full-resolution card (laid out, not visible) */}
      <View style={styles.offscreen} pointerEvents="none">
        <ShareableCard ref={ref} data={data} />
      </View>

      <SpringBottomSheet visible={visible} onClose={onClose} title={t("share.title")}>
        <AsterCameo text={t("profileUi.share.asterLine")} size={52} style={styles.cameo} />
        <EnterView scale delay={120} style={styles.previewWrap}>
          <View style={styles.previewClip}>
            <View style={styles.previewScaler}>
              <ShareableCard data={data} />
            </View>
          </View>
        </EnterView>

        {status === "unavailable" ? (
          <AppText variant="bodySmall" center color={colors.semantic.error} style={styles.msg}>
            {t("share.unavailable")}
          </AppText>
        ) : status === "error" ? (
          <StateView kind="error" compact message={t("share.error")} style={styles.msg} />
        ) : null}
        <ChunkyButton
          label={status === "error" ? t("common.retry") : t("share.cta")}
          onPress={share}
          loading={busy}
          disabled={status === "unavailable"}
          style={styles.cta}
          icon={<Ionicons name="share-social" size={18} color={palette.primary.on} />}
        />
      </SpringBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: "absolute",
    left: -CARD_W - 200,
    top: 0,
    width: CARD_W,
    height: CARD_H,
  },
  previewWrap: {
    alignItems: "center",
  },
  cameo: {
    marginBottom: spacing.lg,
  },
  previewClip: {
    width: PREVIEW_W,
    height: PREVIEW_H,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: depth.md,
    borderBottomColor: surface.slab,
  },
  cta: {
    marginTop: spacing.xl,
  },
  previewScaler: {
    width: CARD_W,
    height: CARD_H,
    transform: [{ scale: SCALE }],
    // scale origin is center; shift back to top-left so it fills the clip
    marginLeft: -(CARD_W - PREVIEW_W) / 2,
    marginTop: -(CARD_H - PREVIEW_H) / 2,
  },
  msg: {
    marginTop: spacing.md,
  },
});
