import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { PaywallSheet } from "../../components/PaywallSheet";
import { astrologyApi } from "../../services/astrologyApi";
import { ChatMessage } from "../../services/types";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useAppStore, FREE_DAILY_MESSAGES } from "../../store/useAppStore";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii, fonts } from "../../lib/design-system";

export function CompanionScreen({ seed }: { seed?: string }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
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
  const seededRef = useRef(false);

  const today = new Date().toISOString().slice(0, 10);
  const usedToday = msgDate === today ? msgCount : 0;
  const atLimit = !isPremium && usedToday >= FREE_DAILY_MESSAGES;

  useEffect(() => {
    astrologyApi.getChatHistory().then(setMessages).catch(() => {});
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

  // Fire a seeded question (from a Today chip) once.
  useEffect(() => {
    if (seed && !seededRef.current && dto) {
      seededRef.current = true;
      void send(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, dto]);

  return (
    <ScreenWrapper>
      {/* ScreenWrapper already applies the top safe-area inset — don't double it. */}
      <View style={styles.topBar}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color={colors.text.secondary} />
        </Pressable>
        <AppText variant="heading">{t("companion.name")}</AppText>
        <View style={{ width: 26 }} />
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
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 && !sending ? (
            <AppText variant="serifBody" center color={colors.text.secondary} style={styles.empty}>
              {t("companion.emptyChat")}
            </AppText>
          ) : null}

          {messages.map((m) => (
            <MotiView
              key={m.id}
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 240 }}
              style={m.role === "user" ? styles.userRow : styles.asterRow}
            >
              <View style={m.role === "user" ? styles.userBubble : styles.asterBubble}>
                <AppText
                  variant="body"
                  color={m.role === "user" ? colors.text.onGold : colors.text.primary}
                >
                  {m.content}
                </AppText>
                {m.why ? (
                  <>
                    <Pressable onPress={() => setWhyOpen((w) => ({ ...w, [m.id]: !w[m.id] }))}>
                      <AppText variant="label" color={colors.gold[300]} style={styles.whyToggle}>
                        {whyOpen[m.id] ? t("companion.hideWhy") : t("companion.showWhy")}
                      </AppText>
                    </Pressable>
                    {whyOpen[m.id] ? (
                      <AppText variant="bodySmall" color={colors.text.tertiary} style={styles.why}>
                        {m.why}
                      </AppText>
                    ) : null}
                  </>
                ) : null}
              </View>
            </MotiView>
          ))}

          {sending ? (
            <View style={styles.asterRow}>
              <View style={styles.asterBubble}>
                <CelestialLoader size="sm" />
              </View>
            </View>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.inputBar,
            { paddingBottom: (kbShown ? 0 : insets.bottom) + spacing.sm },
          ]}
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
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || sending}
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendDisabled]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.text.onGold} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} variant="premium" />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
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
  whyToggle: {
    marginTop: spacing.sm,
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
  sendDisabled: {
    opacity: 0.4,
  },
});
