import { useEffect, useState } from "react";
import { haptics } from "../../lib/haptics";

/** One phase of the 4·4·4 breath Aster's "breathe" motion runs on. */
export const BREATH_PHASE_S = 4;
export const BREATH_PHASES = ["inhale", "hold", "exhale"] as const;
export type BreathPhase = (typeof BREATH_PHASES)[number];

/**
 * The guided-breath clock shared by Aster's breathing minute and the
 * visualise practice: whole seconds elapsed while `running`, a soft tick on
 * every phase change, and `done` once `total` seconds have passed. Pausing
 * (running → false) keeps the elapsed time; resuming continues from it.
 */
export function useBreathClock(running: boolean, total: number) {
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!running || done) return;
    const started = Date.now() - elapsed * 1000;
    const timer = setInterval(() => {
      const s = Math.min(total, Math.floor((Date.now() - started) / 1000));
      setElapsed((prev) => {
        if (s !== prev && s % BREATH_PHASE_S === 0 && s < total) haptics.select();
        return s;
      });
      if (s >= total) {
        clearInterval(timer);
        setDone(true);
      }
    }, 250);
    return () => clearInterval(timer);
    // `elapsed` only seeds the clock when (re)starting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, done, total]);

  const phase: BreathPhase = BREATH_PHASES[Math.floor(elapsed / BREATH_PHASE_S) % BREATH_PHASES.length];
  return { elapsed, done, phase, remaining: total - elapsed };
}
