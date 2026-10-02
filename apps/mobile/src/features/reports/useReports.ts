import { useCallback, useEffect, useMemo, useState } from "react";
import { astrologyApi } from "../../services/astrologyApi";
import { ApiError } from "../../services/httpAstrologyApi";
import type { ReportData, ReportKind, ReportMeta } from "../../services/types";
import { useAppStore } from "../../store/useAppStore";
import { useReportsStore } from "../../store/useReportsStore";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useTranslation } from "../../i18n";
import { deleteReportPdf, renderReportPdf, reportPdfExists, shareReportPdf } from "./pdf/exportPdf";

/** Mirrors REPORTS_DAILY_PER_DEVICE on the API (shown in the limit message). */
export const REPORTS_PER_DAY = 3;

export type ReportError = "limit" | "paused" | "offline" | "error";

const POLL_FIRST_MS = 1200;
const POLL_START_MS = 2000;
const POLL_MAX_MS = 8000;

const isActive = (r: ReportMeta) => r.status === "queued" || r.status === "running";

const byNewest = (a: ReportMeta, b: ReportMeta) => b.createdAt.localeCompare(a.createdAt);

function errorOf(err: unknown): ReportError {
  if (!(err instanceof ApiError)) return "error";
  if (err.status === 429) return "limit";
  if (err.status === 503) return "paused";
  if (err.status === 0) return "offline";
  return "error";
}

/**
 * Everything the Reports screen does. Reports are server jobs (dozens of AI
 * sections); this hook starts them, polls the ones still running — including
 * jobs started before the app was closed, via the persisted `pending` list —
 * and turns each finished report into a PDF on this phone as soon as it's
 * ready.
 */
export function useReports() {
  const { t, locale } = useTranslation();
  const dto = useBirthDto();
  const profile = useAppStore((s) => s.birthProfile);
  const displayName = useAppStore((s) => s.displayName);
  const pending = useReportsStore((s) => s.pending);
  const files = useReportsStore((s) => s.files);

  const [reports, setReports] = useState<ReportMeta[] | null>(null);
  const [creating, setCreating] = useState<ReportKind | null>(null);
  const [making, setMaking] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<ReportError | null>(null);

  const upsert = useCallback((meta: ReportMeta) => {
    setReports((list) => [meta, ...(list ?? []).filter((r) => r.id !== meta.id)].sort(byNewest));
  }, []);

  const drop = useCallback((id: string) => {
    setReports((list) => (list ?? []).filter((r) => r.id !== id));
    useReportsStore.getState().removePending(id);
  }, []);

  useEffect(() => {
    let alive = true;
    astrologyApi
      .listReports()
      .then((list) => {
        if (alive) setReports([...list].sort(byNewest));
      })
      .catch(() => {
        if (alive) setReports([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const makePdf = useCallback(async (meta: ReportMeta, data?: ReportData | null): Promise<string> => {
    setMaking((m) => ({ ...m, [meta.id]: true }));
    try {
      const full = data ?? (await astrologyApi.getReport(meta.id)).data;
      if (!full) throw new Error("report_not_ready");
      const uri = await renderReportPdf(meta, full);
      useReportsStore.getState().saveFile({ reportId: meta.id, kind: meta.kind, uri, createdAt: meta.createdAt });
      return uri;
    } finally {
      setMaking((m) => {
        const next = { ...m };
        delete next[meta.id];
        return next;
      });
    }
  }, []);

  // Jobs to poll: the ones this phone started plus any the server says are running.
  const watchKey = useMemo(() => {
    const ids = new Set(pending.map((p) => p.id));
    for (const r of reports ?? []) if (isActive(r)) ids.add(r.id);
    return [...ids].sort().join("|");
  }, [pending, reports]);

  useEffect(() => {
    const ids = watchKey ? watchKey.split("|") : [];
    if (!ids.length) return;
    let alive = true;
    let delay = POLL_START_MS;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      for (const id of ids) {
        try {
          const { data, ...meta } = await astrologyApi.getReport(id);
          if (!alive) return;
          upsert(meta);
          if (meta.status === "ready") {
            useReportsStore.getState().removePending(id);
            const saved = useReportsStore.getState().files.find((f) => f.reportId === id);
            if (!saved || !reportPdfExists(saved.uri)) await makePdf(meta, data).catch(() => undefined);
          } else if (meta.status === "failed") {
            useReportsStore.getState().removePending(id);
          }
        } catch (err) {
          if (!alive) return;
          // Deleted elsewhere (or wiped with the device's data): stop watching it.
          if (err instanceof ApiError && err.status === 404) drop(id);
        }
      }
      if (!alive) return;
      delay = Math.min(Math.round(delay * 1.25), POLL_MAX_MS);
      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, POLL_FIRST_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [watchKey, upsert, drop, makePdf]);

  const create = useCallback(
    async (kind: ReportKind) => {
      if (!dto || !profile || creating) return;
      setError(null);
      setCreating(kind);
      try {
        const meta = await astrologyApi.createReport(
          dto,
          {
            kind,
            name: displayName.trim().slice(0, 60) || t("reports.youFallback"),
            placeName: profile.placeName?.trim().slice(0, 120) || undefined,
            unknownTime: !!profile.unknownTime,
          },
          locale,
        );
        if (meta.status === "failed") {
          setError(meta.error === "offline" ? "offline" : "error");
          return;
        }
        upsert(meta);
        useReportsStore.getState().addPending(meta.id, meta.kind);
      } catch (err) {
        setError(errorOf(err));
      } finally {
        setCreating(null);
      }
    },
    [dto, profile, creating, displayName, locale, t, upsert],
  );

  const open = useCallback(
    async (meta: ReportMeta) => {
      setError(null);
      try {
        const saved = useReportsStore.getState().files.find((f) => f.reportId === meta.id);
        const uri = saved && reportPdfExists(saved.uri) ? saved.uri : await makePdf(meta);
        await shareReportPdf(uri, meta.kind === "natal" ? t("reports.pdf.natalTitle") : t("reports.pdf.transitTitle"));
      } catch (err) {
        setError(errorOf(err));
      }
    },
    [makePdf, t],
  );

  const remove = useCallback(
    async (meta: ReportMeta) => {
      setError(null);
      try {
        await astrologyApi.deleteReport(meta.id);
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) {
          setError(errorOf(err));
          return;
        }
      }
      const saved = useReportsStore.getState().files.find((f) => f.reportId === meta.id);
      if (saved) deleteReportPdf(saved.uri);
      useReportsStore.getState().removeFile(meta.id);
      drop(meta.id);
    },
    [drop],
  );

  const activeJob = useCallback((kind: ReportKind) => (reports ?? []).find((r) => r.kind === kind && isActive(r)), [reports]);

  const hasFile = useCallback((id: string) => files.some((f) => f.reportId === id), [files]);

  return { reports, creating, making, error, clearError: () => setError(null), create, open, remove, activeJob, hasFile };
}
