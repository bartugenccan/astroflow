/**
 * Chiron's longitude from the JPL Horizons table (chiron-table.ts).
 *
 * The table holds one apparent geocentric longitude every two days, 1900–2100,
 * unwrapped so it never jumps at 360°. Between samples a 4-point Lagrange
 * (cubic) interpolation is used: Chiron's motion, retrograde loops included,
 * is smooth on that scale, so the error stays well under an arcsecond.
 *
 * Pure and import-free on purpose (the table is passed in), so the unit tests
 * can load it with node --experimental-strip-types.
 */

const DAY_MS = 86_400_000;

export interface ChironTable {
  startMs: number;
  stepMs: number;
  /** Unwrapped longitudes, degrees. */
  values: Float64Array;
}

export interface PackedChironTable {
  startUtc: string;
  stepDays: number;
  samples: number;
  scale: number;
  packed: string;
}

/** Decode the packed base-36 delta string into unwrapped degrees. */
export function decodeChironTable(t: PackedChironTable): ChironTable {
  const parts = t.packed.split(',');
  if (parts.length !== t.samples) throw new Error(`Chiron table: ${parts.length} samples, expected ${t.samples}`);
  const values = new Float64Array(parts.length);
  let acc = 0;
  for (let i = 0; i < parts.length; i++) {
    acc += parseInt(parts[i], 36);
    values[i] = acc / t.scale;
  }
  return { startMs: Date.parse(`${t.startUtc}T00:00:00Z`), stepMs: t.stepDays * DAY_MS, values };
}

/** First and last instant the table covers. */
export function chironRange(table: ChironTable): { fromMs: number; toMs: number } {
  return { fromMs: table.startMs, toMs: table.startMs + (table.values.length - 1) * table.stepMs };
}

/**
 * Chiron's apparent ecliptic longitude [0, 360) at an instant, or NaN outside
 * 1900–2100 (callers drop the point rather than guess).
 */
export function chironLongitudeAt(table: ChironTable, ms: number): number {
  const { values, startMs, stepMs } = table;
  const x = (ms - startMs) / stepMs;
  const n = values.length;
  if (!(x >= 0 && x <= n - 1)) return NaN;
  // Four samples around x (shifted inwards at the ends).
  const i1 = Math.min(Math.max(Math.floor(x), 1), n - 3);
  const i0 = i1 - 1;
  const t = x - i1; // position relative to i1, in steps
  const y0 = values[i0];
  const y1 = values[i1];
  const y2 = values[i1 + 1];
  const y3 = values[i1 + 2];
  // Lagrange basis on nodes -1, 0, 1, 2.
  const v =
    (-t * (t - 1) * (t - 2) * y0) / 6 +
    ((t + 1) * (t - 1) * (t - 2) * y1) / 2 -
    ((t + 1) * t * (t - 2) * y2) / 2 +
    ((t + 1) * t * (t - 1) * y3) / 6;
  return ((v % 360) + 360) % 360;
}
