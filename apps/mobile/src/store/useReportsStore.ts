import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ReportKind } from "../services/types";

/** A PDF saved on this phone (documents/reports/…). */
export interface LocalReportFile {
  reportId: string;
  kind: ReportKind;
  uri: string;
  createdAt: string;
}

interface ReportsState {
  /** Server jobs still being prepared, so polling resumes after the app restarts. */
  pending: { id: string; kind: ReportKind }[];
  files: LocalReportFile[];
  addPending: (id: string, kind: ReportKind) => void;
  removePending: (id: string) => void;
  saveFile: (file: LocalReportFile) => void;
  removeFile: (reportId: string) => void;
  reset: () => void;
}

export const useReportsStore = create<ReportsState>()(
  persist(
    (set) => ({
      pending: [],
      files: [],
      addPending: (id, kind) => set((s) => ({ pending: [{ id, kind }, ...s.pending.filter((p) => p.id !== id)] })),
      removePending: (id) => set((s) => ({ pending: s.pending.filter((p) => p.id !== id) })),
      saveFile: (file) => set((s) => ({ files: [file, ...s.files.filter((f) => f.reportId !== file.reportId)] })),
      removeFile: (reportId) => set((s) => ({ files: s.files.filter((f) => f.reportId !== reportId) })),
      reset: () => set({ pending: [], files: [] }),
    }),
    {
      name: "astroflow-reports",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ pending: s.pending, files: s.files }),
    },
  ),
);
