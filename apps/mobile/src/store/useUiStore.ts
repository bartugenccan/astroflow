import { create } from "zustand";

/**
 * Transient, cross-screen UI state. `sheetOpen` lets the floating tab bar know
 * to slide out of the way when a bottom sheet is open (the tab bar lives at the
 * navigator level and would otherwise paint over the sheet's bottom content).
 */
interface UiState {
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sheetOpen: false,
  setSheetOpen: (sheetOpen) => set({ sheetOpen }),
}));
