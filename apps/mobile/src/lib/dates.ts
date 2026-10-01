import { Locale } from "../i18n";

/**
 * Localized month names. Kept here rather than in the i18n dictionary because
 * the typed resolver returns strings only — arrays fall through to the key.
 */
const MONTHS_SHORT: Record<Locale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  tr: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
};

/** `1`-based month number to its short localized name. */
export function monthShort(locale: Locale, month: number): string {
  return MONTHS_SHORT[locale][Math.min(11, Math.max(0, month - 1))] ?? "";
}

/** `"2026-06"` → `"Jun 2026"` / `"Haz 2026"`. Returns the input if unparseable. */
export function formatMonthYear(locale: Locale, ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  return `${monthShort(locale, +m[2])} ${m[1]}`;
}

/** `"2026-03-14"` → `"14 Mar 2026"`. Returns the input if unparseable. */
export function formatDayMonthYear(locale: Locale, iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${+m[3]} ${monthShort(locale, +m[2])} ${m[1]}`;
}

/**
 * Whole days from `now` until the next birthday for an ISO birth date
 * (`"1994-07-21"`). 0 on the birthday itself. Feb 29 birthdays fall on Mar 1
 * in non-leap years (JS date rollover).
 */
export function daysUntilBirthday(birthDate: string, now: Date = new Date()): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!m) return 0;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), +m[2] - 1, +m[3]);
  if (next < today) next = new Date(today.getFullYear() + 1, +m[2] - 1, +m[3]);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

/** Number of days in a 1-based month. */
export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/** Today as a local "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** `"2026-10-30"` + n days, calendar-safe. */
export function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** `"2026-09-27"` → `"Sunday, 27 September 2026"` / `"27 Eylül 2026 Pazar"`. Non-ISO strings pass through. */
export function formatLongDay(iso: string | undefined, locale: Locale, withWeekday = true): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  try {
    return d.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
      ...(withWeekday ? { weekday: "long" as const } : {}),
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
