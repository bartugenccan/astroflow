import type { CSSProperties } from 'react';

/**
 * Aster for the web, drawn as one inline SVG. The geometry and stage colours
 * are copied from the app (apps/mobile/src/components/aster/asterShapes.ts and
 * AsterMascot.tsx) so the site and the app show the same character.
 *
 * Motion is pure CSS (globals.css, "Aster" block): the body floats and
 * squashes, the eyes blink, sparkles twinkle and the glow breathes. Every
 * instance needs its own `id` — SVG gradient ids are global to the page.
 */

const CX = 100;
const CY = 112;
const OUTER_R = 70;
const INNER_R = 45;
const STAGE_SCALE = [1, 0.7, 0.82, 0.92, 0.98, 1.02];

type Pt = [number, number];

function lerp(a: Pt, b: Pt, t: number): Pt {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function fmt(p: Pt): string {
  return `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
}

function roundedStarPath(cx: number, cy: number, outer: number, inner: number, tip = 0.32, notch = 0.22): string {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
  }
  let d = '';
  for (let i = 0; i < 10; i++) {
    const v = pts[i];
    const t = i % 2 === 0 ? tip : notch;
    const a = lerp(v, pts[(i + 9) % 10], t);
    const b = lerp(v, pts[(i + 1) % 10], t);
    d += `${i === 0 ? 'M' : 'L'} ${fmt(a)} Q ${fmt(v)} ${fmt(b)} `;
  }
  return `${d}Z`;
}

/** Tiny four-point sparkle centred on (x, y). */
export function sparklePath(x: number, y: number, r: number): string {
  const k = r * 0.28;
  return `M ${x} ${y - r} Q ${x + k} ${y - k} ${x + r} ${y} Q ${x + k} ${y + k} ${x} ${y + r} Q ${x - k} ${y + k} ${x - r} ${y} Q ${x - k} ${y - k} ${x} ${y - r} Z`;
}

/** Aster's body outline on the 200×200 artboard (also drawn by the OG image). */
export const BODY_PATH = roundedStarPath(CX, CY, OUTER_R, INNER_R);
const EGG_PATH =
  'M100 34 C 136 34 156 92 156 126 C 156 160 132 180 100 180 C 68 180 44 160 44 126 C 44 92 64 34 100 34 Z';
const EGG_CRACK = 'M52 118 L66 110 L76 122 L90 108 L102 122 L114 108 L126 122 L138 110 L148 118';
const TAIL: Pt[] = [
  [56, 150],
  [34, 164],
  [20, 150],
  [8, 168],
];

export interface AsterProps {
  /** 0 = cosmic egg … 5 = Nova. */
  stage?: number;
  /** Unique per page: prefixes the gradient ids. */
  id: string;
  size?: number | string;
  mood?: 'happy' | 'glowing';
  /** Accessible name; without it Aster is decorative. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function Aster({ stage = 3, id, size = 200, mood = 'happy', label, className, style }: AsterProps) {
  const s = Math.max(0, Math.min(5, Math.round(stage)));
  const body = `${id}-body`;
  const glow = `${id}-glow`;
  const scale = `translate(${CX} ${CY}) scale(${STAGE_SCALE[s]}) translate(${-CX} ${-CY})`;
  const eyeY = CY - 6;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`aster aster-s${s}${className ? ` ${className}` : ''}`}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <radialGradient id={glow} cx="50%" cy="56%" r="50%">
          <stop offset="0" className={s === 5 ? 'stop-glow-nova' : 'stop-glow'} />
          <stop offset="1" className="stop-glow-end" />
        </radialGradient>
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: `var(--stage${s}-top)` }} />
          <stop offset="1" style={{ stopColor: `var(--stage${s}-bottom)` }} />
        </linearGradient>
      </defs>

      <g className="aster-glow">
        <circle cx={CX} cy={CY} r={s === 0 ? 84 : 64 + s * 8} fill={`url(#${glow})`} />
        {s === 5
          ? Array.from({ length: 8 }, (_, i) => {
              const a = (i * Math.PI) / 4;
              return (
                <path
                  key={i}
                  className="aster-ray"
                  d={`M ${CX} ${CY} L ${CX + 98 * Math.cos(a - 0.12)} ${CY + 98 * Math.sin(a - 0.12)} L ${CX + 98 * Math.cos(a + 0.12)} ${CY + 98 * Math.sin(a + 0.12)} Z`}
                />
              );
            })
          : null}
      </g>

      <g className="aster-float">
        <g className="aster-squash">
          {s === 0 ? (
            <g>
              <path d={EGG_PATH} transform="translate(0 7)" style={{ fill: 'var(--stage0-slab)' }} />
              <path d={EGG_PATH} fill={`url(#${body})`} />
              <ellipse cx={78} cy={70} rx={10} ry={16} className="aster-shine" transform="rotate(20 78 70)" />
              <path d={sparklePath(124, 72, 9)} className="fill-star" />
              <path d={sparklePath(70, 146, 7)} className="fill-candy" />
              <path d={sparklePath(132, 150, 6)} className="fill-primary" />
              <path d={sparklePath(98, 164, 5)} className="fill-sky" />
              <g className="aster-ink-line">
                <path d="M 80 112 Q 87 118 94 112" />
                <path d="M 106 112 Q 113 118 120 112" />
              </g>
              <ellipse cx={74} cy={124} rx={7} ry={4} className="aster-cheek" />
              <ellipse cx={126} cy={124} rx={7} ry={4} className="aster-cheek" />
              <path d={EGG_CRACK} className="aster-crack" />
            </g>
          ) : (
            <g transform={scale}>
              {s >= 4 ? (
                <g>
                  <path d={`M ${TAIL.map((p) => p.join(' ')).join(' L ')}`} className="aster-tail" />
                  {TAIL.slice(1).map(([x, y], i) => (
                    <path key={i} d={sparklePath(x, y, 5 - i)} className="fill-star100 aster-twinkle" style={{ animationDelay: `${i * 0.4}s` }} />
                  ))}
                </g>
              ) : null}
              {s >= 3 ? <ellipse cx={CX} cy={CY - 76} rx={30} ry={8} className="aster-halo" /> : null}
              <path d={BODY_PATH} transform="translate(0 7)" style={{ fill: `var(--stage${s}-slab)` }} />
              <path d={BODY_PATH} fill={`url(#${body})`} />
              <ellipse cx={74} cy={84} rx={11} ry={6} className="aster-shine" transform="rotate(-32 74 84)" />

              {mood === 'glowing' ? (
                <g className="aster-ink-line wide">
                  <path d={`M ${CX - 27} ${eyeY + 3} Q ${CX - 19} ${eyeY - 9} ${CX - 11} ${eyeY + 3}`} />
                  <path d={`M ${CX + 11} ${eyeY + 3} Q ${CX + 19} ${eyeY - 9} ${CX + 27} ${eyeY + 3}`} />
                </g>
              ) : (
                <g className="aster-eyes">
                  <ellipse cx={CX - 19} cy={eyeY} rx={7} ry={9} className="fill-ink" />
                  <ellipse cx={CX + 19} cy={eyeY} rx={7} ry={9} className="fill-ink" />
                  <circle cx={CX - 21.5} cy={eyeY - 3.5} r={2.6} className="fill-sparkle" />
                  <circle cx={CX + 16.5} cy={eyeY - 3.5} r={2.6} className="fill-sparkle" />
                </g>
              )}
              <ellipse cx={CX - 32} cy={CY + 9} rx={8} ry={5} className="aster-cheek" />
              <ellipse cx={CX + 32} cy={CY + 9} rx={8} ry={5} className="aster-cheek" />
              {mood === 'glowing' ? (
                <g>
                  <path d={`M ${CX - 11} ${CY + 9} Q ${CX} ${CY + 27} ${CX + 11} ${CY + 9} Z`} className="fill-ink" />
                  <ellipse cx={CX} cy={CY + 18} rx={5} ry={3} className="fill-candy" />
                </g>
              ) : (
                <path d={`M ${CX - 9} ${CY + 10} Q ${CX} ${CY + 20} ${CX + 9} ${CY + 10}`} className="aster-ink-line" />
              )}
              {s >= 3 ? (
                <ellipse cx={CX} cy={CY - 76} rx={30} ry={8} className="aster-halo" strokeDasharray="0 47 48 0" />
              ) : null}
            </g>
          )}
        </g>
      </g>

      {s >= 2 ? (
        <g>
          <path d={sparklePath(32, 44, 7)} className="fill-star100 aster-twinkle" />
          <path d={sparklePath(172, 150, 5)} className="fill-star300 aster-twinkle" style={{ animationDelay: '0.7s' }} />
          {s >= 4 ? <path d={sparklePath(170, 40, 6)} className="fill-violet aster-twinkle" style={{ animationDelay: '1.3s' }} /> : null}
        </g>
      ) : (
        <path d={sparklePath(150, 60, 5)} className="fill-star100 aster-twinkle" />
      )}
    </svg>
  );
}
