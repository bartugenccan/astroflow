import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
} from "react-native";
import type { ScrollViewInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useReducedMotion,
  cancelAnimation,
} from "react-native-reanimated";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { useMascotStore, NO_EQUIPPED } from "../../store/useMascotStore";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { PressableScale } from "../../components/ui/PressableScale";
import { IconButton } from "../../components/ui/IconButton";
import { StateView } from "../../components/ui/StateView";
import { BackButton } from "../../components/ui/BackButton";
import { PaywallSheet } from "../../components/PaywallSheet";
import { SpotlightCard } from "../../components/ui/SpotlightCard";
import { astrologyApi } from "../../services/astrologyApi";
import { ChatMessage } from "../../services/types";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useAppStore, FREE_DAILY_MESSAGES } from "../../store/useAppStore";
import { useTranslation } from "../../i18n";
import { colors, depth, spacing, radii, fonts, motion, palette, surface, typography } from "../../lib/design-system";

/** Springy rise for a freshly-sent / freshly-received bubble. */
const bubbleEnter = FadeInDown.springify()
  .damping(motion.spring.gentle.damping)
  .stiffness(motion.spring.gentle.stiffness)
  .mass(motion.spring.gentle.mass);

export function CompanionScreen() {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const dto = useBirthDto();

  const isPremium = useAppStore((s) => s.isPremium);
  const msgDate = useAppStore((s) => s.companionMsgDate);
  const msgCount = useAppStore((s) => s.companionMsgCount);
  const recordMessage = useAppStore((s) => s.recordCompanionMessage);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const mascot = useMascotStore((s) => s.state);
  const [whyOpen, setWhyOpen] = useState<Record<string, boolean>>({});
  const [paywall, setPaywall] = useState(false);
  const [kbShown, setKbShown] = useState(false);
  const [history, setHistory] = useState<"loading" | "ready" | "error">("loading");
  const scrollRef = useRef<ScrollViewInstance>(null);
  // History loaded on open appears in place; only new bubbles spring in.
  const historyIds = useRef<Set<string>>(new Set());

  const today = new Date().toISOString().slice(0, 10);
  const usedToday = msgDate === today ? msgCount : 0;
  // A bought taste (chatPass, +5) adds to today's free messages.
  const chatPasses = mascot?.passesToday?.chat ?? 0;
  const atLimit = !isPremium && usedToday >= FREE_DAILY_MESSAGES + chatPasses;
  const passItem = mascot?.catalog?.find((i) => i.id === "chatPass");
  const purchase = useMascotStore((s) => s.purchase);
  const [buyingPass, setBuyingPass] = useState(false);
  const buyPass = async () => {
    setBuyingPass(true);
    await purchase("chatPass");
    setBuyingPass(false);
  };

  const loadHistory = () => {
    setHistory("loading");
    astrologyApi
      .getChatHistory()
      .then((h) => {
        historyIds.current = new Set(h.map((m) => m.id));
        // Keep anything sent while the history was still on its way.
        setMessages((cur) => [...h, ...cur.filter((m) => !historyIds.current.has(m.id))]);
        setHistory("ready");
      })
      .catch(() => setHistory("error"));
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the keyboard so the input bar doesn't add the bottom safe-area inset
  // (which would float it above the keyboard) while it's open.
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(showEvt, () => {
      setKbShown(true);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    });
    const h = Keyboard.addListener(hideEvt, () => setKbShown(false));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || sending || !dto) return;
    if (atLimit) {
      setPaywall(true);
      return;
    }
    setInput("");
    setSending(true);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: clean,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    try {
      const reply = await astrologyApi.sendMessage(dto, clean, locale);
      // Only an answered message counts against the free daily allowance.
      recordMessage();
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: reply.reply,
          takeaway: reply.takeaway,
          why: reply.why,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      // Drop the unanswered bubble and give the text back so a retry is one tap.
      setMessages((m) => m.filter((x) => x.id !== userMsg.id));
      setInput((cur) => cur || clean);
      Alert.alert(t("companion.name"), t("companion.sendFailed"));
    } finally {
      setSending(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  const canSend = !!input.trim() && !sending;

  return (
    <ScreenWrapper>
      {/* ScreenWrapper already applies the top safe-area inset — don't double it. */}
      <View style={styles.topBar}>
        {/* Companion slides up from the bottom, so it dismisses with a close. */}
        <BackButton icon="close" />
        <View style={styles.topCenter}>
          {/* Aster is the companion's face: it talks while a reply is being written. */}
          <AsterMascot
            stage={Math.max(1, mascot?.stage ?? 1)}
            mood={mascot?.mood === "sleepy" ? "happy" : mascot?.mood ?? "happy"}
            accessories={mascot?.equipped ?? NO_EQUIPPED}
            action={sending ? "talk" : "idle"}
            size={44}
          />
          <AppText variant="heading" numberOfLines={1}>
            {t("companion.name")}
          </AppText>
        </View>
        {/* Mirrors the close button so Aster sits in the true centre. */}
        <View style={styles.topSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && !sending ? (
            history === "loading" ? (
              <StateView kind="loading" message={t("companion.thinking")} style={styles.state} />
            ) : history === "error" ? (
              <StateView
                kind="error"
                message={t("profileUi.companion.historyError")}
                onAction={loadHistory}
                style={styles.state}
              />
            ) : (
              <StateView
                kind="empty"
                message={t("profileUi.companion.emptyTitle")}
                detail={t("profileUi.companion.emptyDetail")}
                style={styles.state}
              />
            )
          ) : null}
          {/* Aster is an AI: say so where the conversation happens. */}
          <AppText variant="label" center color={colors.text.tertiary}>
            {t("aiConsent.footnote")}
          </AppText>

          {messages.map((m) => {
            const isUser = m.role === "user";
            const fresh = !historyIds.current.has(m.id);
            return (
              <Animated.View
                key={m.id}
                entering={fresh ? bubbleEnter : FadeIn.duration(motion.duration.base)}
                style={isUser ? styles.userRow : styles.asterRow}
              >
                <View style={isUser ? styles.userBubble : styles.asterBubble}>
                  <AppText variant="body" color={isUser ? colors.text.onAccent : colors.text.primary}>
                    {m.content}
                  </AppText>
                  {m.why ? (
                    <>
                      <PressableScale
                        onPress={() => setWhyOpen((w) => ({ ...w, [m.id]: !w[m.id] }))}
                        scaleTo={0.94}
                        hitSlop={8}
                        style={styles.whyToggle}
                        accessibilityRole="button"
                        accessibilityLabel={whyOpen[m.id] ? t("companion.hideWhy") : t("companion.showWhy")}
                        accessibilityState={{ expanded: !!whyOpen[m.id] }}
                      >
                        <Ionicons
                          name={whyOpen[m.id] ? "chevron-up" : "chevron-down"}
                          size={12}
                          color={colors.star[300]}
                        />
                        <AppText variant="labelLong" color={colors.star[300]} style={styles.shrink}>
                          {whyOpen[m.id] ? t("companion.hideWhy") : t("companion.showWhy")}
                        </AppText>
                      </PressableScale>
                      {whyOpen[m.id] ? (
                        <Animated.View entering={FadeInDown.duration(motion.duration.base)}>
                          <AppText variant="bodySmall" color={colors.text.tertiary} style={styles.why}>
                            {m.why}
                          </AppText>
                        </Animated.View>
                      ) : null}
                    </>
                  ) : null}
                </View>
              </Animated.View>
            );
          })}

          {sending ? (
            <Animated.View entering={bubbleEnter} style={styles.asterRow}>
              <View
                style={[styles.asterBubble, styles.typingBubble]}
                accessibilityLabel={t("companion.thinking")}
              >
                <TypingDots />
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>

        {atLimit ? (
          <SpotlightCard
            tone="primary"
            icon="chatbubbles"
            eyebrow={t("companion.limitEyebrow")}
            title={t("companion.limitTitle")}
            cta={{ label: t("paywall.unlockPremium"), onPress: () => setPaywall(true) }}
            secondary={
              passItem && chatPasses === 0
                ? {
                    label: t("companion.passCta", { n: passItem.price }),
                    onPress: () => void buyPass(),
                    disabled: buyingPass || (mascot?.stardust ?? 0) < passItem.price,
                  }
                : undefined
            }
            style={styles.limitCard}
          />
        ) : null}
        <View
          style={[styles.inputBar, { paddingBottom: (kbShown ? 0 : insets.bottom) + spacing.sm }]}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t("companion.inputPlaceholder")}
            placeholderTextColor={colors.text.tertiary}
            style={styles.input}
            multiline
            onSubmitEditing={() => send(input)}
            accessibilityLabel={t("profileUi.companion.composerLabel")}
          />
          <IconButton
            icon="arrow-up"
            tone="star"
            size={52}
            onPress={() => send(input)}
            disabled={!canSend}
            accessibilityLabel={t("companion.send")}
          />
        </View>
      </KeyboardAvoidingView>

      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} variant="premium" />
    </ScreenWrapper>
  );
}

/** Three gold dots bouncing in a staggered loop — Aster "typing". */
function TypingDots() {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <TypingDot key={i} index={i} />
      ))}
    </View>
  );
}

function TypingDot({ index }: { index: number }) {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    const ease = Easing.inOut(Easing.quad);
    y.value = withDelay(
      index * 140,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 280, easing: ease }),
          withTiming(0, { duration: 280, easing: ease }),
          withTiming(0, { duration: 260 }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(y);
  }, [index, reduced, y]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.45 + y.value * 0.55,
    transform: [{ translateY: -y.value * 5 }],
  }));

  return <Animated.View style={[styles.dot, reduced ? styles.dotStatic : null, style]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  topCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  state: {
    marginTop: spacing.xl,
  },
  topSpacer: {
    width: 40,
  },
  shrink: {
    flexShrink: 1,
  },
  messages: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  userRow: { alignItems: "flex-end" },
  asterRow: { alignItems: "flex-start" },
  userBubble: {
    maxWidth: "84%",
    backgroundColor: palette.star.face,
    borderRadius: radii.lg,
    borderBottomRightRadius: radii.sm,
    borderBottomWidth: depth.sm,
    borderBottomColor: palette.star.slab,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  asterBubble: {
    maxWidth: "88%",
    backgroundColor: surface.card,
    borderRadius: radii.lg,
    borderBottomLeftRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: depth.sm + 1,
    borderBottomColor: surface.slab,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  typingBubble: {
    paddingVertical: spacing.md + 2,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 14,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.star[300],
  },
  dotStatic: {
    opacity: 0.7,
  },
  whyToggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    marginTop: spacing.xs,
    minHeight: 32,
  },
  why: {
    marginTop: spacing.xs,
  },
  limitCard: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.border.chunky,
    backgroundColor: surface.card,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 52,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: depth.sm + 1,
    borderBottomColor: surface.slab,
    backgroundColor: surface.raised,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    color: colors.text.primary,
    fontFamily: fonts.sans,
    fontSize: typography.body.fontSize,
  },
});
