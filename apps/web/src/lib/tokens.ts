/**
 * "Kozmik Şeker" tokens for the website — the same values as the app's
 * design system (apps/mobile/src/lib/design-system.ts). Change both together.
 *
 * Components never write a colour: CSS reads these as custom properties
 * (`cssVariables()` is printed into <head> by the layouts), and the few places
 * that cannot read CSS (the OG image) import them directly.
 */

type Tone = { face: string; slab: string; on: string; soft: string };

export const palette = {
  primary: { face: '#7C4DFF', slab: '#5530C9', on: '#FFFFFF', soft: 'rgba(124,77,255,0.18)' },
  candy: { face: '#FF6FB5', slab: '#C9407F', on: '#2A0718', soft: 'rgba(255,111,181,0.18)' },
  star: { face: '#FFC83D', slab: '#C99300', on: '#2B1A00', soft: 'rgba(255,200,61,0.18)' },
  mint: { face: '#2FD08A', slab: '#1E9A63', on: '#04261A', soft: 'rgba(47,208,138,0.18)' },
  sky: { face: '#4CC9F0', slab: '#2A93B8', on: '#04222E', soft: 'rgba(76,201,240,0.18)' },
  danger: { face: '#FF5C6C', slab: '#C23545', on: '#FFFFFF', soft: 'rgba(255,92,108,0.18)' },
  cloud: { face: '#FFF8FF', slab: '#BDB2E6', on: '#1A1240', soft: 'rgba(255,248,255,0.18)' },
} satisfies Record<string, Tone>;

export type ToneName = keyof typeof palette;

export const surface = {
  deep: '#160F3A', // below the page (footer, phone bezel)
  base: '#211853', // page background
  card: '#2C2168',
  raised: '#372A7E',
  accent: '#45349A',
  slab: '#150E38', // hard shadow under night cards
  outline: '#43348F',
  nebulaViolet: '#4B2FB0',
  nebulaPink: '#B23A8A',
};

export const text = {
  primary: '#FFF8FF',
  secondary: 'rgba(255,248,255,0.78)',
  tertiary: 'rgba(255,248,255,0.6)',
  violet: '#B9A2FF',
  accent: '#FFD25C',
  moon: '#CFD6FF',
};

export const art = {
  ink: '#2E2463', // Aster's eyes and mouth
  blush: '#FF8FC5',
  sparkle: '#FFFFFF',
  star100: '#FFF4D1',
  star300: '#FFD25C',
  glow: 'rgba(255,200,61,0.40)',
};

/** Aster's body per stage (egg → Nova), from art.stageBody in the app. */
export const stageBody = [
  { top: '#FFF6DC', bottom: '#FFE0A0', slab: '#E3BC6E' },
  { top: '#FFF0B8', bottom: '#FFD25C', slab: '#E2A512' },
  { top: '#FFEC9E', bottom: '#FFC83D', slab: '#D99A00' },
  { top: '#FFE98F', bottom: '#FFBE2E', slab: '#D08F00' },
  { top: '#FFE680', bottom: '#FFB31F', slab: '#C98600' },
  { top: '#FFF3B0', bottom: '#FFA8D8', slab: '#C9407F' },
] as const;

/** Every token as a CSS custom property, e.g. --primary-face, --surface-base. */
export function cssVariables(): string {
  const vars: string[] = [];
  for (const [name, tone] of Object.entries(palette)) {
    for (const [k, v] of Object.entries(tone)) vars.push(`--${name}-${k}:${v}`);
  }
  for (const [k, v] of Object.entries(surface)) vars.push(`--surface-${k}:${v}`);
  for (const [k, v] of Object.entries(text)) vars.push(`--text-${k}:${v}`);
  for (const [k, v] of Object.entries(art)) vars.push(`--art-${k}:${v}`);
  stageBody.forEach((s, i) => {
    vars.push(`--stage${i}-top:${s.top}`, `--stage${i}-bottom:${s.bottom}`, `--stage${i}-slab:${s.slab}`);
  });
  return `:root{${vars.join(';')}}`;
}
