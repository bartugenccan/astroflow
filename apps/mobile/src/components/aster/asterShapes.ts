/**
 * Geometry for Aster, on a 200×200 artboard. The body is a chubby five-point
 * star whose corners are rounded with quadratic curves (outer tips softer than
 * the inner notches), so it reads as a squishy character rather than an icon.
 */

export const ART = 200;
export const CX = 100;
export const CY = 112;
export const OUTER_R = 70;
export const INNER_R = 45;

type Pt = [number, number];

function lerp(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function fmt(p: Pt): string {
  return `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
}

/** Star outline with rounded corners. `tip` / `notch` = how far along each edge the rounding reaches (0–0.5). */
export function roundedStarPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  tip = 0.32,
  notch = 0.22,
): string {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
  }
  let d = "";
  for (let i = 0; i < 10; i++) {
    const v = pts[i];
    const prev = pts[(i + 9) % 10];
    const next = pts[(i + 1) % 10];
    const t = i % 2 === 0 ? tip : notch;
    const a = lerp(v, prev, t);
    const b = lerp(v, next, t);
    d += `${i === 0 ? "M" : "L"} ${fmt(a)} Q ${fmt(v)} ${fmt(b)} `;
  }
  return `${d}Z`;
}

/** Tiny four-point sparkle centred on (x, y). */
export function sparklePath(x: number, y: number, r: number): string {
  const k = r * 0.28;
  return [
    `M ${x} ${y - r}`,
    `Q ${x + k} ${y - k} ${x + r} ${y}`,
    `Q ${x + k} ${y + k} ${x} ${y + r}`,
    `Q ${x - k} ${y + k} ${x - r} ${y}`,
    `Q ${x - k} ${y - k} ${x} ${y - r}`,
    "Z",
  ].join(" ");
}

export const BODY_PATH = roundedStarPath(CX, CY, OUTER_R, INNER_R);

/** Egg: a slightly pointy-topped oval. */
export const EGG_PATH =
  "M100 34 C 136 34 156 92 156 126 C 156 160 132 180 100 180 C 68 180 44 160 44 126 C 44 92 64 34 100 34 Z";

/** Zig-zag crack across the egg's waist. */
export const EGG_CRACK =
  "M52 118 L66 110 L76 122 L90 108 L102 122 L114 108 L126 122 L138 110 L148 118";

/** Arm tips (side points of the star) — where hand accessories sit. */
export const LEFT_HAND: Pt = [
  CX + OUTER_R * Math.cos(-Math.PI / 2 - (2 * Math.PI) / 5),
  CY + OUTER_R * Math.sin(-Math.PI / 2 - (2 * Math.PI) / 5),
];
export const RIGHT_HAND: Pt = [
  CX + OUTER_R * Math.cos(-Math.PI / 2 + (2 * Math.PI) / 5),
  CY + OUTER_R * Math.sin(-Math.PI / 2 + (2 * Math.PI) / 5),
];
export const HEAD_TIP: Pt = [CX, CY - OUTER_R];

/** Body scale per stage — Aster visibly grows. Index = stage. */
export const STAGE_SCALE = [1, 0.7, 0.82, 0.92, 0.98, 1.02];

/** Body palette per stage: warm gold, getting richer as Aster grows. */
export const BODY_COLORS: { top: string; bottom: string; slab: string }[] = [
  { top: "#FFF6DC", bottom: "#FFE0A0", slab: "#E3BC6E" }, // egg shell
  { top: "#FFF0B8", bottom: "#FFD25C", slab: "#E2A512" },
  { top: "#FFEC9E", bottom: "#FFC83D", slab: "#D99A00" },
  { top: "#FFE98F", bottom: "#FFBE2E", slab: "#D08F00" },
  { top: "#FFE680", bottom: "#FFB31F", slab: "#C98600" },
  { top: "#FFF3B0", bottom: "#FFA8D8", slab: "#C9407F" }, // Nova: candy-gold
];
