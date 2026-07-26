import { Locale } from "../../i18n";

/**
 * Human-friendly, localized dwell time for a transit through a house.
 * Buckets by magnitude so the same helper reads well for Moon (days) and
 * Pluto (years). Matches the backend `durationPhrase` wording.
 */
export function formatDuration(days: number, locale: Locale): string {
  const d = Math.max(0, Math.round(days));
  if (locale === "tr") {
    if (d <= 1) return "~1 gün";
    if (d < 14) return `~${d} gün`;
    if (d < 60) return `~${Math.round(d / 7)} hafta`;
    if (d < 365) return `~${Math.round(d / 30)} ay`;
    return `~${(d / 365).toFixed(1)} yıl`;
  }
  if (d <= 1) return "~1 day";
  if (d < 14) return `~${d} days`;
  if (d < 60) return `~${Math.round(d / 7)} wk`;
  if (d < 365) return `~${Math.round(d / 30)} mo`;
  return `~${(d / 365).toFixed(1)} yr`;
}
