import { create } from "zustand";
import type { GlossaryTermId } from "../lib/glossary";

/**
 * Transient, cross-screen UI state.
 *
 * `sheetCount` lets the floating tab bar slide out of the way while any bottom
 * sheet is open (the tab bar lives at the navigator level and would otherwise
 * paint over the sheet's bottom content). Every `SpringBottomSheet` registers
 * itself, so it's a counter rather than a boolean — closing one of two stacked
 * sheets must not bring the bar back.
 *
 * `termId` drives the single app-wide glossary sheet: any `TermInfo` can open
 * it without each screen owning its own sheet state.
 */
interface UiState {
  sheetCount: number;
  sheetOpen: boolean;
  pushSheet: () => void;
  popSheet: () => void;

  termId: GlossaryTermId | null;
  openTerm: (id: GlossaryTermId) => void;
  closeTerm: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sheetCount: 0,
  sheetOpen: false,
  pushSheet: () =>
    set((s) => ({ sheetCount: s.sheetCount + 1, sheetOpen: true })),
  popSheet: () =>
    set((s) => {
      const sheetCount = Math.max(0, s.sheetCount - 1);
      return { sheetCount, sheetOpen: sheetCount > 0 };
    }),

  termId: null,
  openTerm: (termId) => set({ termId }),
  closeTerm: () => set({ termId: null }),
}));
