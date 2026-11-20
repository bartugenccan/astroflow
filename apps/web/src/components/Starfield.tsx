import type { CSSProperties } from 'react';

/** Small deterministic PRNG so the static HTML and every visit draw the same sky. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h;
}

const TINTS = ['', ' tint-star', ' tint-candy', ' tint-sky', ' tint-violet'];

/**
 * A twinkling sky behind a section: dots, a few four-point sparkles and
 * (optionally) shooting stars. Decorative; paused off-screen by <Motion />.
 */
export function Starfield({
  seed,
  count = 70,
  shooting = 0,
  className,
}: {
  seed: string;
  count?: number;
  shooting?: number;
  className?: string;
}) {
  const rand = mulberry32(hash(seed));
  const stars = Array.from({ length: count }, (_, i) => {
    const big = rand() > 0.88;
    const style = {
      left: `${(rand() * 100).toFixed(2)}%`,
      top: `${(rand() * 100).toFixed(2)}%`,
      '--d': `${(2.4 + rand() * 4).toFixed(2)}s`,
      '--delay': `${(-rand() * 6).toFixed(2)}s`,
      '--s': (big ? 1.6 + rand() * 1.2 : 0.6 + rand() * 0.9).toFixed(2),
    } as CSSProperties;
    const tint = TINTS[Math.floor(rand() * TINTS.length)];
    return <span key={i} className={`star${big ? ' sparkle' : ''}${tint}`} style={style} />;
  });
  const meteors = Array.from({ length: shooting }, (_, i) => {
    const style = {
      left: `${(20 + rand() * 70).toFixed(1)}%`,
      top: `${(rand() * 40).toFixed(1)}%`,
      '--delay': `${(i * 4.5 + rand() * 3).toFixed(2)}s`,
    } as CSSProperties;
    return <span key={i} className="meteor" style={style} />;
  });
  return (
    <div className={`starfield${className ? ` ${className}` : ''}`} aria-hidden="true" data-loop>
      {stars}
      {meteors}
    </div>
  );
}
