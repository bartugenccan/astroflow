import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Directory, File, Paths } from "expo-file-system";
import { Locale, translate } from "../../../i18n";
import type { ReportData, ReportMeta } from "../../../services/types";
import { loadPdfFonts } from "./fonts";
import { PdfContext } from "./html";
import { buildNatalHtml } from "./natalHtml";
import { buildTransitHtml } from "./transitHtml";

// A4 in PostScript points; the stylesheet's own @page sets zero margins.
const A4 = { width: 595, height: 842 };

/**
 * Renders a finished report to an A4 PDF on this phone and returns its URI
 * (documents/reports/…). The text is in the report's own language — the one
 * the AI wrote it in — not whatever the app is set to today.
 */
export async function renderReportPdf(meta: ReportMeta, data: ReportData): Promise<string> {
  const locale: Locale = meta.locale === "tr" ? "tr" : "en";
  const ctx: PdfContext = { locale, t: (key, params) => translate(locale, key, params) };
  const fontsCss = await loadPdfFonts();
  const html = data.kind === "natal" ? buildNatalHtml(data, ctx, fontsCss) : buildTransitHtml(data, ctx, fontsCss);

  const { uri } = await Print.printToFileAsync({
    html,
    ...A4,
    margins: { left: 0, top: 0, right: 0, bottom: 0 },
  });

  const dir = new Directory(Paths.document, "reports");
  dir.create({ intermediates: true, idempotent: true });
  const day = meta.createdAt.slice(0, 10);
  const dest = new File(dir, `astroflow-${meta.kind}-${day}-${meta.id.slice(0, 8)}.pdf`);
  if (dest.exists) dest.delete();
  await new File(uri).move(dest);
  return dest.uri;
}

/** The OS share sheet for a saved PDF (Quick Look / Files on iOS, any PDF app on Android). */
export async function shareReportPdf(uri: string, title: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error("sharing_unavailable");
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: title });
}

/** Removes a saved PDF; a file that is already gone is fine. */
export function deleteReportPdf(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already removed.
  }
}

/** Whether a saved PDF is still on disk (the OS may clear it on restore). */
export function reportPdfExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}
