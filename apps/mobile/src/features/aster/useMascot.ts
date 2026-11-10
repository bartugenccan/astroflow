import { useCallback } from "react";
import { useFocusEffect } from "expo-router";
import { useMascotStore } from "../../store/useMascotStore";

/**
 * Aster's state for a screen, refreshed when the screen gains focus so quests
 * and counters reflect what happened elsewhere (a check-in, a tarot draw).
 * Every action that changes Aster already re-reads the state itself, so a
 * focus only refetches once the last read has gone stale — switching tabs
 * doesn't cost a request and a re-render each time. The last known state
 * renders instantly from the persisted cache.
 */
export function useMascot() {
  const state = useMascotStore((s) => s.state);
  const loading = useMascotStore((s) => s.loading);
  const refresh = useMascotStore((s) => s.refresh);
  const refreshIfStale = useMascotStore((s) => s.refreshIfStale);

  useFocusEffect(
    useCallback(() => {
      refreshIfStale();
    }, [refreshIfStale]),
  );

  return { state, loading, refresh };
}
