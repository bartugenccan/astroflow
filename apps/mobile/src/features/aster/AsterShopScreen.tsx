import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { BackButton } from "../../components/ui/BackButton";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { StatPill, StatRow } from "../../components/ui/StatPill";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { EnterView } from "../../lib/motion";
import { useMascotStore } from "../../store/useMascotStore";
import type { MascotCatalogItem } from "../../services/types";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, palette, spacing } from "../../lib/design-system";
import { stageName } from "./asterCopy";
import { useMascot } from "./useMascot";

const SLOT_ORDER = ["head", "neck", "hand", "aura", "shield"] as const;

/**
 * Aster's shop and wardrobe in one: tap an item to try it on the big Aster,
 * buy with Yıldız Tozu, wear / take off what you own. Shields are bought here
 * too. Prices and ownership come from the server.
 */
export function AsterShopScreen() {
  const { t } = useTranslation();
  const { state } = useMascot();
  const purchase = useMascotStore((s) => s.purchase);
  const equip = useMascotStore((s) => s.equip);
  const [preview, setPreview] = useState<MascotCatalogItem | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const equipped = state?.equipped ?? [];
  const catalog = state?.catalog ?? [];
  const stage = state?.stage ?? 0;

  const worn = useMemo(() => {
    if (!preview || preview.kind !== "accessory") return equipped;
    const sameSlot = catalog.find((c) => c.slot === preview.slot && equipped.includes(c.id));
    return [...equipped.filter((id) => id !== sameSlot?.id), preview.id];
  }, [preview, equipped, catalog]);

  const groups = SLOT_ORDER.map((slot) => ({
    slot,
    items: catalog.filter((c) => (slot === "shield" ? c.kind === "shield" : c.slot === slot)),
  })).filter((g) => g.items.length > 0);

  const buy = async (item: MascotCatalogItem) => {
    if ((state?.stardust ?? 0) < item.price) {
      setMessage(t("aster.shop.notEnough"));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      return;
    }
    if (item.kind === "shield" && (state?.shields ?? 0) >= (state?.maxShields ?? 3)) {
      setMessage(t("aster.shop.shieldFull"));
      return;
    }
    setBusy(item.id);
    const ok = await purchase(item.id);
    setBusy(null);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setMessage(t("aster.shop.bought"));
      if (item.kind === "accessory") await toggleWear(item, true);
    } else {
      setMessage(t("aster.shop.failed"));
    }
  };

  const toggleWear = async (item: MascotCatalogItem, wear: boolean) => {
    const fresh = useMascotStore.getState().state;
    const current = fresh?.equipped ?? equipped;
    const sameSlot = (fresh?.catalog ?? catalog).filter((c) => c.slot === item.slot).map((c) => c.id);
    const nextIds = wear ? [...current.filter((id) => !sameSlot.includes(id)), item.id] : current.filter((id) => id !== item.id);
    setBusy(item.id);
    await equip(nextIds);
    setBusy(null);
    setPreview(null);
  };

  return (
    <ScreenWrapper>
      <View style={styles.topBar}>
        <BackButton />
        <StatRow>
          <StatPill
            icon="sparkles"
            tone="star"
            value={state?.stardust ?? 0}
            accessibilityLabel={`${state?.stardust ?? 0} ${t("aster.stardust")}`}
          />
          <StatPill
            icon="shield-checkmark"
            tone="primary"
            value={state?.shields ?? 0}
            accessibilityLabel={`${state?.shields ?? 0} ${t("aster.shields")}`}
          />
        </StatRow>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <EnterView style={styles.hero}>
          <AsterMascot stage={Math.max(1, stage)} mood="glowing" accessories={worn} size={180} action="idle" />
          <AppText variant="title" center>
            {t("aster.shop.title")}
          </AppText>
          <AppText variant="body" center>
            {t("aster.shop.subtitle")}
          </AppText>
          {message ? (
            <AppText variant="heading" center color={palette.star.face} accessibilityLiveRegion="polite">
              {message}
            </AppText>
          ) : null}
        </EnterView>

        {groups.map((g, gi) => (
          <EnterView key={g.slot} index={gi + 1} style={styles.group}>
            <AppText variant="label">{t(`aster.shop.slots.${g.slot}` as TranslationKey)}</AppText>
            <View style={styles.grid}>
              {g.items.map((item) => {
                const isWorn = equipped.includes(item.id);
                const free = item.price === 0 && !item.locked;
                const owned = item.owned || free;
                const isPreview = preview?.id === item.id;
                return (
                  <ChunkyCard
                    key={item.id}
                    containerStyle={styles.cell}
                    style={[styles.item, isPreview && styles.itemActive]}
                    padded={false}
                    tone={isWorn ? "primary" : "night"}
                    tinted={isWorn}
                    depth="sm"
                    onPress={() => {
                      setMessage(null);
                      setPreview(item.kind === "accessory" ? item : null);
                    }}
                    accessibilityLabel={t(`aster.shop.items.${item.id}` as TranslationKey)}
                  >
                    {item.kind === "shield" ? (
                      <View style={styles.shieldIcon}>
                        <Ionicons name="shield-checkmark" size={44} color={palette.primary.face} />
                      </View>
                    ) : (
                      <AsterMascot stage={Math.max(1, stage)} mood="happy" accessories={[item.id]} size={84} action="sleep" />
                    )}
                    <AppText variant="labelLong" color={colors.text.primary} center numberOfLines={2}>
                      {t(`aster.shop.items.${item.id}` as TranslationKey)}
                    </AppText>
                    {item.locked ? (
                      <View style={styles.price}>
                        <Ionicons name="lock-closed" size={13} color={colors.text.tertiary} />
                        <AppText variant="bodySmall" numberOfLines={2} center>
                          {t("aster.shop.locked", { stage: stageName(t, item.minStage) })}
                        </AppText>
                      </View>
                    ) : owned && item.kind === "accessory" ? (
                      <ChunkyButton
                        label={isWorn ? t("aster.shop.takeOff") : t("aster.shop.wear")}
                        variant={isWorn ? "ghost" : "mint"}
                        size="sm"
                        loading={busy === item.id}
                        onPress={() => toggleWear(item, !isWorn)}
                        style={styles.btn}
                      />
                    ) : (
                      <ChunkyButton
                        label={t("aster.shop.buy", { n: item.price })}
                        variant="star"
                        size="sm"
                        icon={<Ionicons name="sparkles" size={14} color={palette.star.on} />}
                        loading={busy === item.id}
                        onPress={() => buy(item)}
                        style={styles.btn}
                      />
                    )}
                  </ChunkyCard>
                );
              })}
            </View>
          </EnterView>
        ))}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 80, gap: spacing.xl },
  hero: { alignItems: "center", gap: spacing.xs },
  group: { gap: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  cell: { width: "47%" },
  item: { alignItems: "center", gap: spacing.sm, padding: spacing.md },
  itemActive: { borderColor: palette.star.face },
  shieldIcon: { height: 84, alignItems: "center", justifyContent: "center" },
  price: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 40 },
  btn: { alignSelf: "stretch" },
});
