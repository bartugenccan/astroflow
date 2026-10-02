import type { NatalChartData, TransitMovement } from "../../../services/types";
import { glyphSvg } from "../../../lib/glyphData";
import { CHALLENGING, GOLD, HARMONIC, INK, MUTED, esc } from "./html";

/**
 * The chart wheel as an SVG string, drawn from the real positions: sign band,
 * the actual (Placidus) house cusps from the API, planets at their exact
 * longitude, and the natal aspects as chords. The Ascendant sits on the left
 * and the zodiac runs counter-clockwise, as on a printed chart.
 *
 * With `transits` it becomes a bi-wheel: today's planets ride an outer ring
 * with ticks onto the zodiac, the natal chart stays inside.
 */

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

const ELEMENT_OF_INDEX = ["Fire", "Earth", "Air", "Water"] as const;

const ELEMENT_TINT: Record<string, string> = {
  Fire: "#F6E6D9",
  Earth: "#ECEADA",
  Air: "#E7ECF3",
  Water: "#E2EDEE",
};

const ELEMENT_INK: Record<string, string> = {
  Fire: "#B0553F",
  Earth: "#6E7A3C",
  Air: "#4D6A93",
  Water: "#2F7A82",
};

const PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

export interface WheelLabels {
  asc: string;
  mc: string;
}

interface WheelPoint {
  name: string;
  lon: number;
  degree: number;
  retrograde: boolean;
}

/** Ecliptic longitude 0–360 from a sign + degree + minute. */
export function longitude(sign: string, degree: number, minute = 0): number {
  const i = SIGNS.indexOf(sign as (typeof SIGNS)[number]);
  return (i < 0 ? 0 : i * 30) + degree + minute / 60;
}

const norm = (deg: number) => ((deg % 360) + 360) % 360;

/** Signed shortest distance a → b in degrees (−180, 180]. */
function delta(a: number, b: number): number {
  const d = norm(b - a);
  return d > 180 ? d - 360 : d;
}

/**
 * Display positions so glyphs don't overlap: neighbours closer than `gap` are
 * pushed apart symmetrically, a few dozen passes round the circle. True
 * positions are kept for the ticks.
 */
function spread(points: WheelPoint[], gap: number): Map<string, number> {
  const sorted = [...points].sort((a, b) => a.lon - b.lon);
  const shown = sorted.map((p) => p.lon);
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 0; i < shown.length && shown.length > 1; i++) {
      const j = (i + 1) % shown.length;
      const d = delta(shown[i], shown[j]);
      if (d >= 0 && d < gap) {
        const push = (gap - d) / 2;
        shown[i] = norm(shown[i] - push);
        shown[j] = norm(shown[j] + push);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return new Map(sorted.map((p, i) => [p.name, shown[i]]));
}

const f = (n: number) => n.toFixed(2);

export function chartWheelSvg(
  chart: NatalChartData,
  opts: { unknownTime: boolean; labels: WheelLabels; transits?: TransitMovement[]; size?: number },
): string {
  const size = opts.size ?? 520;
  const c = size / 2;
  const bi = !!opts.transits?.length;
  const showHouses = !opts.unknownTime;

  // Radii as fractions of the half-size, so the wheel scales cleanly.
  const k = c / 260;
  const R = bi
    ? { transit: 238 * k, zodiacOut: 214 * k, zodiacIn: 180 * k, houseNum: 168 * k, planet: 140 * k, degree: 118 * k, inner: 100 * k }
    : { transit: 0, zodiacOut: 252 * k, zodiacIn: 212 * k, houseNum: 198 * k, planet: 170 * k, degree: 146 * k, inner: 124 * k };

  const asc = showHouses ? longitude(chart.angles.ascendant.sign, chart.angles.ascendant.degree, chart.angles.ascendant.minute) : 0;
  const angle = (lon: number) => Math.PI + ((lon - asc) * Math.PI) / 180;
  const pt = (r: number, lon: number): [number, number] => [c + r * Math.cos(angle(lon)), c - r * Math.sin(angle(lon))];

  const parts: string[] = [];

  // Paper + outer frame.
  parts.push(`<circle cx="${c}" cy="${c}" r="${f(R.zodiacOut + (bi ? 46 * k : 6 * k))}" fill="#FFFDF8" stroke="${GOLD}" stroke-width="0.8"/>`);
  if (bi) parts.push(`<circle cx="${c}" cy="${c}" r="${f(R.transit + 20 * k)}" fill="none" stroke="${GOLD}" stroke-width="0.6" stroke-dasharray="2 3"/>`);

  // Sign band.
  for (let i = 0; i < 12; i++) {
    const a0 = i * 30;
    const a1 = a0 + 30;
    const element = ELEMENT_OF_INDEX[i % 4];
    const [x0, y0] = pt(R.zodiacOut, a0);
    const [x1, y1] = pt(R.zodiacOut, a1);
    const [x2, y2] = pt(R.zodiacIn, a1);
    const [x3, y3] = pt(R.zodiacIn, a0);
    // Longitude grows counter-clockwise on screen → sweep-flag 0 on the outer arc.
    parts.push(
      `<path d="M${f(x0)} ${f(y0)} A${f(R.zodiacOut)} ${f(R.zodiacOut)} 0 0 0 ${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} A${f(R.zodiacIn)} ${f(R.zodiacIn)} 0 0 1 ${f(x3)} ${f(y3)} Z" fill="${ELEMENT_TINT[element]}" stroke="${GOLD}" stroke-width="0.6"/>`,
    );
    const [gx, gy] = pt((R.zodiacOut + R.zodiacIn) / 2, a0 + 15);
    parts.push(glyphSvg(SIGNS[i], gx, gy, 19 * k, ELEMENT_INK[element], 1.3));
  }

  // Degree ticks on the inner edge of the band.
  for (let d = 0; d < 360; d += 5) {
    const len = (d % 10 === 0 ? 6 : 3.5) * k;
    const [x0, y0] = pt(R.zodiacIn, d);
    const [x1, y1] = pt(R.zodiacIn - len, d);
    parts.push(`<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${GOLD}" stroke-width="0.5"/>`);
  }
  parts.push(`<circle cx="${c}" cy="${c}" r="${f(R.zodiacIn)}" fill="none" stroke="${GOLD}" stroke-width="0.8"/>`);
  parts.push(`<circle cx="${c}" cy="${c}" r="${f(R.inner)}" fill="#FFFFFF" stroke="${GOLD}" stroke-width="0.8"/>`);

  // Houses: real cusps, angles drawn heavier, numbers mid-house.
  if (showHouses && chart.houses.length === 12) {
    const cusps = chart.houses.map((h) => longitude(h.sign, h.degree, h.minute));
    cusps.forEach((cusp, i) => {
      const angular = i % 3 === 0;
      const [x0, y0] = pt(R.zodiacIn, cusp);
      const [x1, y1] = pt(R.inner, cusp);
      parts.push(
        `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${angular ? INK : GOLD}" stroke-width="${angular ? 1.3 : 0.6}"/>`,
      );
      const next = cusps[(i + 1) % 12];
      const mid = cusp + norm(next - cusp) / 2;
      const [nx, ny] = pt(R.inner + 9 * k, mid);
      parts.push(
        `<text x="${f(nx)}" y="${f(ny)}" font-size="${f(8 * k)}" fill="${MUTED}" text-anchor="middle" dominant-baseline="central" font-family="Manrope, sans-serif">${i + 1}</text>`,
      );
    });
    const mc = longitude(chart.angles.midheaven.sign, chart.angles.midheaven.degree, chart.angles.midheaven.minute);
    for (const [lon, label] of [
      [asc, opts.labels.asc],
      [mc, opts.labels.mc],
    ] as [number, string][]) {
      // A short mark through the sign band, the label just inside the aspect circle.
      const [lx, ly] = pt(R.zodiacIn, lon);
      const [ox, oy] = pt(R.zodiacOut + 4 * k, lon);
      parts.push(`<line x1="${f(lx)}" y1="${f(ly)}" x2="${f(ox)}" y2="${f(oy)}" stroke="${INK}" stroke-width="1.3"/>`);
      const [ix, iy] = pt(R.inner - 11 * k, lon);
      parts.push(
        `<text x="${f(ix)}" y="${f(iy)}" font-size="${f(7.5 * k)}" font-weight="700" fill="${INK}" text-anchor="middle" dominant-baseline="central" font-family="Manrope, sans-serif">${esc(label)}</text>`,
      );
    }
  }

  // Natal points.
  const natal: WheelPoint[] = chart.planets
    .filter((p) => PLANETS.includes(p.name))
    .map((p) => ({ name: p.name, lon: longitude(p.sign, p.degree, p.minute), degree: p.degree, retrograde: p.retrograde }));
  natal.push({
    name: "NorthNode",
    lon: longitude(chart.nodes.north.sign, chart.nodes.north.degree, chart.nodes.north.minute),
    degree: chart.nodes.north.degree,
    retrograde: false,
  });
  const byName = new Map(natal.map((p) => [p.name, p]));

  // Aspect chords first, so glyphs sit on top.
  for (const a of chart.aspects) {
    const p1 = byName.get(a.planet1);
    const p2 = byName.get(a.planet2);
    if (!p1 || !p2) continue;
    const color = a.type === "harmonic" ? HARMONIC : a.type === "challenging" ? CHALLENGING : GOLD;
    const [x1, y1] = pt(R.inner, p1.lon);
    const [x2, y2] = pt(R.inner, p2.lon);
    const width = Math.max(0.5, 1.4 - Math.abs(a.orb) * 0.12);
    parts.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${color}" stroke-width="${f(width)}" opacity="0.8"/>`);
  }

  const shown = spread(natal, bi ? 9 : 8);
  for (const p of natal) {
    const at = shown.get(p.name) ?? p.lon;
    const [t0x, t0y] = pt(R.zodiacIn, p.lon);
    const [t1x, t1y] = pt(R.zodiacIn - 7 * k, p.lon);
    parts.push(`<line x1="${f(t0x)}" y1="${f(t0y)}" x2="${f(t1x)}" y2="${f(t1y)}" stroke="${INK}" stroke-width="1"/>`);
    const [gx, gy] = pt(R.planet, at);
    if (Math.abs(delta(at, p.lon)) > 1.5) {
      const [cx1, cy1] = pt(R.planet + 11 * k, at);
      parts.push(`<line x1="${f(t1x)}" y1="${f(t1y)}" x2="${f(cx1)}" y2="${f(cy1)}" stroke="${MUTED}" stroke-width="0.4"/>`);
    }
    parts.push(glyphSvg(p.name, gx, gy, 17 * k, INK, 1.35));
    const [dx, dy] = pt(R.degree, at);
    const deg = `${p.degree}°${p.retrograde ? "℞" : ""}`;
    parts.push(
      `<text x="${f(dx)}" y="${f(dy)}" font-size="${f(7 * k)}" fill="${p.retrograde ? CHALLENGING : MUTED}" text-anchor="middle" dominant-baseline="central" font-family="Manrope, sans-serif">${deg}</text>`,
    );
  }

  // Transit ring.
  if (bi && opts.transits) {
    const sky: WheelPoint[] = opts.transits
      .filter((m) => PLANETS.includes(m.planet))
      .map((m) => ({ name: m.planet, lon: longitude(m.sign, m.degree, m.minute), degree: m.degree, retrograde: m.retrograde }));
    const skyShown = spread(sky, 9);
    for (const p of sky) {
      const at = skyShown.get(p.name) ?? p.lon;
      const [t0x, t0y] = pt(R.zodiacOut, p.lon);
      const [t1x, t1y] = pt(R.zodiacOut + 7 * k, p.lon);
      parts.push(`<line x1="${f(t0x)}" y1="${f(t0y)}" x2="${f(t1x)}" y2="${f(t1y)}" stroke="${GOLD}" stroke-width="1.1"/>`);
      const [gx, gy] = pt(R.transit, at);
      parts.push(`<circle cx="${f(gx)}" cy="${f(gy)}" r="${f(11 * k)}" fill="#FFF7E6" stroke="${GOLD}" stroke-width="0.6"/>`);
      parts.push(glyphSvg(p.name, gx, gy, 14 * k, GOLD, 1.35));
      if (p.retrograde) {
        const [rx, ry] = pt(R.transit + 16 * k, at);
        parts.push(
          `<text x="${f(rx)}" y="${f(ry)}" font-size="${f(7 * k)}" fill="${CHALLENGING}" text-anchor="middle" dominant-baseline="central" font-family="Manrope, sans-serif">℞</text>`,
        );
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" class="wheel">${parts.join("")}</svg>`;
}

/** A thin decorative ring of the twelve signs, for the navy cover. */
export function coverRingSvg(size = 300): string {
  const c = size / 2;
  const parts: string[] = [
    `<circle cx="${c}" cy="${c}" r="${c - 4}" fill="none" stroke="${GOLD}" stroke-width="0.8"/>`,
    `<circle cx="${c}" cy="${c}" r="${c - 40}" fill="none" stroke="${GOLD}" stroke-width="0.6"/>`,
    `<circle cx="${c}" cy="${c}" r="${c - 70}" fill="none" stroke="${GOLD}" stroke-width="0.4" stroke-dasharray="1 4"/>`,
  ];
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * (i * 30)) / 180;
    const x0 = c + (c - 4) * Math.cos(a);
    const y0 = c - (c - 4) * Math.sin(a);
    const x1 = c + (c - 40) * Math.cos(a);
    const y1 = c - (c - 40) * Math.sin(a);
    parts.push(`<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${GOLD}" stroke-width="0.6"/>`);
    const m = (Math.PI * (i * 30 + 15)) / 180;
    parts.push(glyphSvg(SIGNS[i], c + (c - 22) * Math.cos(m), c - (c - 22) * Math.sin(m), 18, "#D9B66F", 1.2));
  }
  parts.push(glyphSvg("Sun", c, c, 54, "#D9B66F", 1.4));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${parts.join("")}</svg>`;
}
