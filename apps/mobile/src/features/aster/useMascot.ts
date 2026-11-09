import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useMascotStore } from "../../store/useMascotStore";

/**
 * Aster's state for a screen, refreshed whenever the screen gains focus so
 * quests and counters reflect what happened elsewhere (a check-in, a tarot
 * draw). The last known state renders instantly from the persisted cache.
 */
export function useMascot() {
  const state = useMascotStore((s) => s.state);
  const loading = useMascotStore((s) => s.loading);
  const refresh = useMascotStore((s) => s.refresh);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return { state, loading, refresh };
}
