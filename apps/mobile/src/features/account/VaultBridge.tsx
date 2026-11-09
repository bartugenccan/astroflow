import { useEffect } from "react";
import { AppState } from "react-native";
import { useAppStore } from "../../store/useAppStore";
import { startVaultSync, stopVaultSync, syncVaultNow } from "../../services/vaultSync";

/**
 * Keeps the signed-in user's notes backup in step: starts sync when an account
 * is present, pulls again whenever the app comes to the foreground, and stops
 * when the account goes away. Renders nothing.
 */
export function VaultBridge() {
  const signedIn = useAppStore((s) => !!s.account);

  useEffect(() => {
    if (!signedIn) {
      stopVaultSync();
      return;
    }
    void startVaultSync();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void syncVaultNow();
    });
    return () => sub.remove();
  }, [signedIn]);

  return null;
}
