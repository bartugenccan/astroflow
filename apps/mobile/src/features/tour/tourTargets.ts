import { useEffect, useRef } from "react";
import type { ScrollViewInstance, ViewInstance } from "react-native";

/** Every place the app tour can point at. */
export type TourTargetId =
  | "today.aster"
  | "today.quests"
  | "tab:index"
  | "tab:manifest"
  | "tab:sky"
  | "tab:tarot"
  | "tab:profile"
  | "profile.notifications";

/** A rectangle in window coordinates (from `measureInWindow`). */
export interface TourRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Target {
  measure: () => Promise<TourRect | null>;
  /** Scrolls the target's screen so it is in view (no-op when it isn't in a scroll view). */
  reveal: (animated: boolean) => void;
}

/**
 * Mounted targets, by id. Module-level on purpose: the tour host lives at the
 * root, far from the screens, and only ever reads the latest registration.
 */
const targets = new Map<TourTargetId, Target>();

export function tourTarget(id: TourTargetId): Target | undefined {
  return targets.get(id);
}

interface TourTargetOptions {
  /** The scroll view the target sits in (at any depth), so the tour can scroll to it. */
  scrollRef?: React.RefObject<ScrollViewInstance | null>;
  /** Space kept above the target when scrolled to (px). */
  offset?: number;
}

/**
 * Makes a view something the app tour can point at. Spread the result on a
 * plain `View`: `<View {...useTourTarget("today.aster")}>`. The view must not
 * be flattened away (`collapsable={false}`), so `measureInWindow` sees it.
 */
export function useTourTarget(id: TourTargetId, { scrollRef, offset = 96 }: TourTargetOptions = {}) {
  const ref = useRef<ViewInstance>(null);

  useEffect(() => {
    const target: Target = {
      measure: () =>
        new Promise((resolve) => {
          const view = ref.current;
          if (!view) {
            resolve(null);
            return;
          }
          view.measureInWindow((x, y, width, height) => {
            resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
          });
        }),
      reveal: (animated) => {
        const scroll = scrollRef?.current;
        const view = ref.current;
        const content = scroll?.getInnerViewRef();
        if (!scroll || !view || !content) return;
        // Measured against the scroll content, so a target nested in cards works too.
        view.measureLayout(
          content,
          (_x, y) => scroll.scrollTo({ y: Math.max(0, y - offset), animated }),
          () => undefined,
        );
      },
    };
    targets.set(id, target);
    return () => {
      if (targets.get(id) === target) targets.delete(id);
    };
  }, [id, scrollRef, offset]);

  return { ref, collapsable: false } as const;
}
