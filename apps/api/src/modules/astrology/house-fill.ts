/**
 * circular-natal-horoscope-js leaves `House` undefined on bodies and points
 * that sit between 0° Aries and the Ascendant whenever the 12th house spans
 * 0° Aries: it stores the 12th house's end as 0° instead of the 1st cusp, so
 * the wrap-around segment matches no house. About 3% of charts have at least
 * one such point, and every consumer read the gap as "house 0".
 *
 * `fillMissingHouses` assigns those points their house from the cusps. Points
 * the library already placed are left untouched.
 */

interface HousedPoint {
  ChartPosition: { Ecliptic: { DecimalDegrees: number } };
  House?: { id: number };
}

interface HousedChart {
  Houses: Array<{ id: number; ChartPosition: { StartPosition: { Ecliptic: { DecimalDegrees: number } } } }>;
  CelestialBodies: { all: HousedPoint[] };
  CelestialPoints: { all: HousedPoint[] };
}

const norm360 = (d: number): number => ((d % 360) + 360) % 360;

/** Which house (1–12) an ecliptic longitude falls in, from the 12 cusp starts ordered by house. */
export function houseOfLongitude(longitude: number, cuspStarts: number[]): number {
  const lon = norm360(longitude);
  for (let i = 0; i < cuspStarts.length; i++) {
    const start = norm360(cuspStarts[i]);
    const span = norm360(cuspStarts[(i + 1) % cuspStarts.length] - start);
    if (norm360(lon - start) < span) return i + 1;
  }
  return 1;
}

export function fillMissingHouses<T extends HousedChart>(chart: T): T {
  if (!chart.Houses?.length) return chart;
  const cusps = chart.Houses.slice()
    .sort((a, b) => a.id - b.id)
    .map((h) => h.ChartPosition.StartPosition.Ecliptic.DecimalDegrees);
  const points = [...(chart.CelestialBodies?.all ?? []), ...(chart.CelestialPoints?.all ?? [])];
  for (const p of points) {
    if (p.House?.id) continue;
    // The library's House objects are bigger, but every consumer reads only `id`.
    p.House = { id: houseOfLongitude(p.ChartPosition.Ecliptic.DecimalDegrees, cusps) };
  }
  return chart;
}
