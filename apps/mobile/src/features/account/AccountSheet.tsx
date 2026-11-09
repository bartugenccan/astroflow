import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import type { TextInputInstance } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { AppText } from "../../components/ui/AppText";
import { GoldButton } from "../../components/ui/GoldButton";
import { DepthButton } from "../../components/ui/DepthButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { useAppStore } from "../../store/useAppStore";
import { useTranslation, type TFunction, type TranslationKey } from "../../i18n";
import { ApiError } from "../../services/httpAstrologyApi";
import {
  AuthCancelled,
  GOOGLE_ENABLED,
  isAppleAvailable,
  signInWithApple,
  signInWithGoogle,
  signOut,
  startEmailSignIn,
  unlinkProvider,
  verifyEmailSignIn,
} from "../../services/auth/account";
import type { AuthProviderId, LinkResult } from "../../services/types";
import { colors, fonts, radii, spacing, surface } from "../../lib/design-system";

const RESEND_SECONDS = 30;
const CODE_LENGTH = 6;

type Step = "choose" | "email" | "code";

interface AccountSheetProps {
  visible: boolean;
  onClose: () => void;
  /** secure = link this phone's data (Profile); signIn = bring an account back (Welcome). */
  intent: "secure" | "signIn";
}

const PROVIDER_LABEL: Record<AuthProviderId, TranslationKey> = {
  apple: "account.providerApple",
  google: "account.providerGoogle",
  email: "account.providerEmail",
};

/** Maps an API failure to copy; null = stay quiet (user cancelled). */
function errorText(err: unknown, t: TFunction, step: Step): string | null {
  if (err instanceof AuthCancelled) return null;
  if (err instanceof ApiError) {
    if (err.code === "ACCOUNT_CONFLICT") return t("account.errorConflict");
    if (err.code === "PROVIDER_ALREADY_LINKED") return t("account.errorProviderLinked");
    if (err.code === "LAST_IDENTITY") return t("account.errorLastIdentity");
    if (err.status === 429) return t("account.errorTooMany");
    if (err.status === 503) return t("account.errorUnavailable");
    if (err.status === 400 && step === "code") return t("account.errorInvalidCode");
  }
  return t("account.errorGeneric");
}

/**
 * Optional account: Apple (iOS), Google, or a 6-digit email code — no
 * passwords. With an account already linked it becomes the manage view:
 * linked methods, add another, sign out.
 */
export function AccountSheet({ visible, onClose, intent }: AccountSheetProps) {
  const { t, locale } = useTranslation();
  const account = useAppStore((s) => s.account);

  const [step, setStep] = useState<Step>("choose");
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<null | "apple" | "google" | "email" | "code" | "remove">(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    isAppleAvailable().then(setAppleAvailable);
  }, []);

  // Fresh state every time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setStep("choose");
    setAdding(false);
    setCode("");
    setError(null);
    setBusy(null);
  }, [visible]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const linked = account?.providers ?? [];
  const managing = !!account && !adding;

  const done = (result: LinkResult) => {
    onClose();
    Alert.alert(t(result.signedIn ? "account.welcomeBack" : "account.linkedDone"));
  };

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorText(err, t, step));
    } finally {
      setBusy(null);
    }
  };

  const sendCode = () =>
    run("email", async () => {
      await startEmailSignIn(email, locale);
      setCode("");
      setStep("code");
      setResendIn(RESEND_SECONDS);
      setTimeout(() => codeRef.current?.focus(), 250);
    });

  const verify = (value: string) =>
    run("code", async () => {
      done(await verifyEmailSignIn(email, value));
    });

  const onCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH && !busy) verify(digits);
  };

  const confirmSignOut = () =>
    Alert.alert(t("account.signOut"), t("account.signOutConfirm"), [
      { text: t("profile.cancel"), style: "cancel" },
      {
        text: t("account.signOut"),
        style: "destructive",
        onPress: () => {
          onClose();
          signOut().catch(() => undefined);
        },
      },
    ]);

  const title = managing
    ? t("account.linkedTitle")
    : intent === "signIn"
      ? t("account.signInTitle")
      : t("account.sheetTitle");

  return (
    <SpringBottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.body}>
        {managing ? (
          <>
            <AppText variant="body" color={colors.text.secondary}>
              {t("account.linkedSub", { providers: linked.map((p) => t(PROVIDER_LABEL[p])).join(", ") })}
            </AppText>
            <View style={styles.list}>
              {linked.map((p) => (
                <View key={p} style={styles.providerRow}>
                  <Ionicons name={providerIcon(p)} size={18} color={colors.star[300]} />
                  <AppText variant="body" color={colors.text.primary} style={styles.grow} numberOfLines={1}>
                    {p === "email" && account?.email ? account.email : t(PROVIDER_LABEL[p])}
                  </AppText>
                  {linked.length > 1 ? (
                    <PressableScale
                      onPress={() => run("remove", () => unlinkProvider(p))}
                      disabled={busy !== null}
                      accessibilityRole="button"
                      accessibilityLabel={`${t("account.remove")}: ${t(PROVIDER_LABEL[p])}`}
                    >
                      <AppText variant="label" color={colors.text.tertiary}>
                        {t("account.remove")}
                      </AppText>
                    </PressableScale>
                  ) : null}
                </View>
              ))}
            </View>
            {error ? <ErrorLine text={error} /> : null}
            {linked.length < 3 ? (
              <DepthButton label={t("account.addMethod")} onPress={() => setAdding(true)} tone="ink" />
            ) : null}
            <DepthButton label={t("account.signOut")} onPress={confirmSignOut} tone="ink" />
          </>
        ) : step === "choose" ? (
          <>
            <AppText variant="body" color={colors.text.secondary}>
              {intent === "signIn" ? t("account.signInBody") : t("account.sheetBody")}
            </AppText>
            {appleAvailable && !linked.includes("apple") ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  intent === "signIn"
                    ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                    : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                }
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={radii.md}
                style={styles.appleButton}
                onPress={() => {
                  if (!busy) run("apple", async () => done(await signInWithApple()));
                }}
              />
            ) : null}
            {GOOGLE_ENABLED && !linked.includes("google") ? (
              <DepthButton
                label={t("account.google")}
                tone="light"
                icon={<Ionicons name="logo-google" size={18} color="#181129" />}
                loading={busy === "google"}
                disabled={busy !== null}
                onPress={() => run("google", async () => done(await signInWithGoogle()))}
              />
            ) : null}
            {!linked.includes("email") ? (
              <DepthButton
                label={t("account.email")}
                tone="ink"
                icon={<Ionicons name="mail-outline" size={18} color={colors.star[300]} />}
                disabled={busy !== null}
                onPress={() => {
                  setError(null);
                  setStep("email");
                }}
              />
            ) : null}
            {error ? <ErrorLine text={error} /> : null}
          </>
        ) : step === "email" ? (
          <>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t("account.emailPlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="send"
              onSubmitEditing={sendCode}
              autoFocus
              accessibilityLabel={t("account.emailPlaceholder")}
            />
            <AppText variant="bodySmall" color={colors.text.tertiary}>
              {t("account.emailNote")}
            </AppText>
            {error ? <ErrorLine text={error} /> : null}
            <GoldButton
              label={t("account.sendCode")}
              onPress={sendCode}
              loading={busy === "email"}
              disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}
            />
          </>
        ) : (
          <>
            <AppText variant="body" color={colors.text.secondary}>
              {t("account.codeSent", { email: email.trim() })}
            </AppText>
            <Pressable onPress={() => codeRef.current?.focus()} style={styles.codeRow} accessibilityRole="none">
              {Array.from({ length: CODE_LENGTH }, (_, i) => (
                <View
                  key={i}
                  style={[styles.codeBox, i === code.length && styles.codeBoxActive, error && styles.codeBoxError]}
                >
                  <AppText variant="title" color={colors.text.primary}>
                    {code[i] ?? ""}
                  </AppText>
                </View>
              ))}
              {/* One real input under the boxes: paste + iOS/Android one-time-code autofill work. */}
              <TextInput
                ref={codeRef}
                value={code}
                onChangeText={onCodeChange}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                style={styles.hiddenInput}
                accessibilityLabel={t("account.verify")}
              />
            </Pressable>
            {error ? <ErrorLine text={error} /> : null}
            <GoldButton
              label={t("account.verify")}
              onPress={() => verify(code)}
              loading={busy === "code"}
              disabled={code.length !== CODE_LENGTH}
            />
            <View style={styles.linksRow}>
              <PressableScale
                onPress={resendIn > 0 ? () => undefined : sendCode}
                disabled={resendIn > 0 || busy !== null}
                accessibilityRole="button"
              >
                <AppText variant="label" color={resendIn > 0 ? colors.text.tertiary : colors.text.accent}>
                  {resendIn > 0 ? t("account.resendIn", { seconds: resendIn }) : t("account.resend")}
                </AppText>
              </PressableScale>
              <PressableScale onPress={() => setStep("email")} accessibilityRole="button">
                <AppText variant="label" color={colors.text.accent}>
                  {t("account.changeEmail")}
                </AppText>
              </PressableScale>
            </View>
          </>
        )}
      </View>
    </SpringBottomSheet>
  );
}

function providerIcon(p: AuthProviderId): React.ComponentProps<typeof Ionicons>["name"] {
  return p === "apple" ? "logo-apple" : p === "google" ? "logo-google" : "mail-outline";
}

function ErrorLine({ text }: { text: string }) {
  return (
    <AppText variant="bodySmall" color={colors.semantic.error} accessibilityLiveRegion="polite">
      {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingBottom: spacing.lg },
  grow: { flex: 1 },
  list: { gap: spacing.sm },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: surface.sheet,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  appleButton: { height: 54 },
  input: {
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: surface.sheet,
    paddingHorizontal: spacing.lg,
    color: colors.text.primary,
    fontFamily: fonts.sansMedium,
    fontSize: 17,
  },
  codeRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  codeBox: {
    flex: 1,
    height: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: surface.sheet,
    alignItems: "center",
    justifyContent: "center",
  },
  codeBoxActive: { borderColor: colors.star[300] },
  codeBoxError: { borderColor: colors.semantic.error },
  hiddenInput: { position: "absolute", opacity: 0, width: "100%", height: "100%" },
  linksRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
});
