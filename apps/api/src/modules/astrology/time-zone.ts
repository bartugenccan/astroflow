/**
 * Local clock ↔ UTC through the runtime's own IANA time-zone database (ICU,
 * updated with every Node release), not the ephemeris library's.
 *
 * circular-natal-horoscope-js bundles its own copy of moment-timezone data
 * from 2019 (tzdata 2019b). Later tzdb releases corrected Turkey's 1940–1985
 * history and record Iran dropping DST in 2022, so the library put many
 * Turkish births of 1963–1985 (and every Iranian summer birth since 2022) an
 * hour off — which turns the Ascendant by about 15°.
 *
 * Wall-clock times are carried as UTC milliseconds whose UTC fields hold the
 * local date and time ("wall ms").
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(zone: string): Intl.DateTimeFormat {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(zone, f);
  }
  return f;
}

/** The zone's offset from UTC (ms, east positive) at a UTC instant. Second-exact, so LMT offsets survive. */
export function zoneOffsetMs(zone: string, utcMs: number): number {
  const whole = Math.floor(utcMs / 1000) * 1000;
  const p: Record<string, number> = {};
  for (const part of formatter(zone).formatToParts(new Date(whole))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - whole;
}

/** Local wall clock (wall ms) at a UTC instant. */
export function wallFromUtc(zone: string, utcMs: number): number {
  return utcMs + zoneOffsetMs(zone, utcMs);
}

/**
 * The UTC instant of a local wall-clock time. A repeated hour (clocks going
 * back) resolves to its first occurrence; a skipped hour (clocks going
 * forward) is read with the offset in force before the change, landing just
 * after the gap — the same rules as Temporal's "compatible" disambiguation.
 */
export function utcFromWall(zone: string, wallMs: number): number {
  const DAY = 86_400_000;
  const before = zoneOffsetMs(zone, wallMs - DAY);
  const after = zoneOffsetMs(zone, wallMs + DAY);
  const valid = [...new Set([before, after])]
    .map((offset) => wallMs - offset)
    .filter((utc) => wallFromUtc(zone, utc) === wallMs);
  if (valid.length) return Math.min(...valid);
  return wallMs - before;
}
