/**
 * Small, pure helpers shared by the day-by-day sky scans (electional scoring,
 * the 24-month transit timeline). Longitudes are ecliptic degrees.
 */

/** Wrap to [0, 360). */
export const norm = (d: number) => ((d % 360) + 360) % 360;

/** Wrap to (-180, 180]: the signed shortest step from one longitude to another. */
export const signed = (d: number) => norm(d + 180) - 180;

/** Angular separation, 0–180. */
export const sep = (a: number, b: number) => Math.abs(signed(a - b));

/** `"2027-10-30"` + n days, calendar-safe (UTC). */
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
