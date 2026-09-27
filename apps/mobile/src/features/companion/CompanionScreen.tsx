import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
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
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { PressableScale } from "../../components/ui/PressableScale";
import { BackButton } from "../../components/ui/BackButton";
import { PaywallSheet } from "../../components/PaywallSheet";
import { astrologyApi } from "../../services/astrologyApi";
import { ChatMessage } from "../../services/types";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useAppStore, FREE_DAILY_MESSAGES } from "../../store/useAppStore";
import { useTranslation } from "../../i18n";
import { EnterView } from "../../lib/motion";
import { colors, spacing, radii, fonts, motion } from "../../lib/design-system";

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
  const [whyOpen, setWhyOpen] = useState<Record<string, boolean>>({});
  const [paywall, setPaywall] = useState(false);
  const [kbShown, setKbShown] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  // History loaded on open appears in place; only new bubbles spring in.
  const historyIds = useRef<Set<string>>(new Set());

  const today = new Date().toISOString().slice(0, 10);
  const usedToday = msgDate === today ? msgCount : 0;
  const atLimit = !isPremium && usedToday >= FREE_DAILY_MESSAGES;

  useEffect(() => {
    astrologyApi
      .getChatHistory()
      .then((h) => {
        historyIds.current = new Set(h.map((m) => m.id));
        setMessages(h);
      })
      .catch(() => {});
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
    recordMessage();
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: clean,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    try {
      const reply = await astrologyApi.sendMessage(dto, clean, locale);
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
      // leave the user message; they can retry
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
        <AppText variant="heading" numberOfLines={1} style={styles.topTitle}>
          {t("companion.name")}
        </AppText>
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
            <EnterView delay={120}>
              <AppText variant="serifBody" center color={colors.text.secondary} style={styles.empty}>
                {t("companion.emptyChat")}
              </AppText>
            </EnterView>
          ) : null}

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
                  <AppText variant="body" color={isUser ? colors.text.onGold : colors.text.primary}>
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
                        accessibilityState={{ expanded: !!whyOpen[m.id] }}
                      >
                        <Ionicons
                          name={whyOpen[m.id] ? "chevron-up" : "chevron-down"}
                          size={12}
                          color={colors.gold[300]}
                        />
                        <AppText variant="labelLong" color={colors.gold[300]} style={styles.shrink}>
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
          />
          <PressableScale
            onPress={() => send(input)}
            disabled={!canSend}
            scaleTo={0.88}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={t("companion.send")}
            style={styles.sendBtn}
          >
            <Ionicons name="arrow-up" size={20} color={colors.text.onGold} />
          </PressableScale>
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
  topTitle: {
    flex: 1,
    textAlign: "center",
  },
  topSpacer: {
    width: 32,
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
  empty: {
    marginTop: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  userRow: { alignItems: "flex-end" },
  asterRow: { alignItems: "flex-start" },
  userBubble: {
    maxWidth: "84%",
    backgroundColor: colors.gold[400],
    borderRadius: radii.lg,
    borderBottomRightRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  asterBubble: {
    maxWidth: "88%",
    backgroundColor: colors.ink[800],
    borderRadius: radii.lg,
    borderBottomLeftRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.hairline,
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
    backgroundColor: colors.gold[300],
  },
  dotStatic: {
    opacity: 0.7,
  },
  whyToggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: 2,
  },
  why: {
    marginTop: spacing.xs,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.hairline,
    backgroundColor: colors.ink[900],
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    color: colors.text.primary,
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.gold[400],
    alignItems: "center",
    justifyContent: "center",
  },
});
