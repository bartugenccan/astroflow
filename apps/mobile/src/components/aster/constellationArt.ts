import type { ConstellationKey } from "../../lib/constellations";

/**
 * Stylised stick figures for Aster's constellation album.
 *
 * These are drawn to be *recognisable* — the shapes people know from star
 * charts (Orion's belt, the Big Dipper, Scorpius' tail, the Sagittarius
 * teapot) — not astronomically exact: star positions are simplified onto a
 * 0..1 square, and some faint stars are left out. Never present them as
 * precise sky maps.
 *
 *   points — [x, y], 0..1, y grows downward.
 *   lines  — pairs of indices into `points`.
 *   bright — indices of the figure's brightest stars (drawn larger).
 */
export interface ConstellationArt {
  points: readonly (readonly [number, number])[];
  lines: readonly (readonly [number, number])[];
  bright?: readonly number[];
}

export const CONSTELLATION_ART: Record<ConstellationKey, ConstellationArt> = {
  aries: {
    // A bent hook: 41 Ari → Hamal → Sheratan → Mesarthim.
    points: [
      [0.1, 0.3],
      [0.45, 0.42],
      [0.74, 0.6],
      [0.84, 0.74],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
    ],
    bright: [1],
  },
  taurus: {
    // The Hyades "V" with Aldebaran, two long horns, the Pleiades.
    points: [
      [0.42, 0.52], // Aldebaran
      [0.56, 0.6],
      [0.64, 0.66], // V vertex
      [0.6, 0.52],
      [0.52, 0.42],
      [0.14, 0.14], // Elnath — horn tip
      [0.16, 0.46], // ζ — horn tip
      [0.84, 0.3], // Pleiades
      [0.82, 0.8],
    ],
    lines: [
      [2, 1],
      [1, 0],
      [0, 6],
      [2, 3],
      [3, 4],
      [4, 5],
      [2, 8],
      [3, 7],
    ],
    bright: [0, 7],
  },
  gemini: {
    // Two twins side by side, heads Castor and Pollux, holding hands.
    points: [
      [0.26, 0.12], // Castor
      [0.32, 0.4],
      [0.36, 0.68],
      [0.28, 0.9],
      [0.56, 0.16], // Pollux
      [0.6, 0.43],
      [0.66, 0.7],
      [0.74, 0.9],
      [0.46, 0.4],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [4, 5],
      [5, 6],
      [6, 7],
      [1, 8],
      [8, 5],
      [0, 4],
    ],
    bright: [0, 4],
  },
  cancer: {
    // A faint upside-down "Y".
    points: [
      [0.5, 0.5],
      [0.46, 0.14],
      [0.2, 0.84],
      [0.8, 0.8],
    ],
    lines: [
      [0, 1],
      [0, 2],
      [0, 3],
    ],
  },
  leo: {
    // The Sickle (a backwards question mark) and the triangle of the hindquarters.
    points: [
      [0.26, 0.72], // Regulus
      [0.26, 0.52],
      [0.33, 0.36], // Algieba
      [0.26, 0.22],
      [0.13, 0.16],
      [0.1, 0.3],
      [0.68, 0.42],
      [0.9, 0.56], // Denebola
      [0.68, 0.66],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [2, 6],
      [6, 7],
      [7, 8],
      [8, 0],
    ],
    bright: [0, 7],
  },
  virgo: {
    // A reclining figure with Spica at the hand.
    points: [
      [0.42, 0.86], // Spica
      [0.46, 0.5], // Porrima
      [0.56, 0.38],
      [0.7, 0.2], // Vindemiatrix
      [0.6, 0.62],
      [0.26, 0.45],
      [0.1, 0.38],
      [0.86, 0.7],
    ],
    lines: [
      [1, 2],
      [2, 3],
      [1, 4],
      [4, 0],
      [1, 5],
      [5, 6],
      [4, 7],
    ],
    bright: [0],
  },
  libra: {
    // The scales: a triangle with two hanging pans.
    points: [
      [0.3, 0.58],
      [0.55, 0.2],
      [0.8, 0.46],
      [0.24, 0.88],
      [0.74, 0.84],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 0],
      [0, 3],
      [2, 4],
    ],
    bright: [1],
  },
  scorpius: {
    // Claws, the red heart Antares, and the long curling tail with the sting.
    points: [
      [0.16, 0.1],
      [0.12, 0.24],
      [0.16, 0.38],
      [0.34, 0.38], // Antares
      [0.44, 0.48],
      [0.52, 0.62],
      [0.55, 0.75],
      [0.6, 0.88],
      [0.72, 0.92],
      [0.85, 0.86],
      [0.9, 0.73],
      [0.82, 0.64],
      [0.74, 0.6], // Shaula — the sting
    ],
    lines: [
      [0, 1],
      [1, 2],
      [1, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
      [9, 10],
      [10, 11],
      [11, 12],
    ],
    bright: [3, 12],
  },
  sagittarius: {
    // The Teapot: spout, lid and handle.
    points: [
      [0.14, 0.56], // spout tip
      [0.3, 0.45],
      [0.28, 0.72],
      [0.45, 0.24], // lid
      [0.55, 0.46],
      [0.6, 0.72],
      [0.76, 0.4],
      [0.86, 0.64],
    ],
    lines: [
      [0, 1],
      [0, 2],
      [1, 3],
      [3, 4],
      [1, 4],
      [2, 5],
      [4, 5],
      [4, 6],
      [5, 7],
      [6, 7],
    ],
    bright: [2, 5],
  },
  capricornus: {
    // A wide sea-goat "boat".
    points: [
      [0.14, 0.22],
      [0.2, 0.34],
      [0.3, 0.7],
      [0.36, 0.84],
      [0.6, 0.76],
      [0.9, 0.3], // Deneb Algedi
      [0.8, 0.33],
      [0.52, 0.38],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 1],
    ],
    bright: [5],
  },
  aquarius: {
    // The water bearer and the zigzag stream pouring from the jar.
    points: [
      [0.1, 0.2],
      [0.3, 0.3],
      [0.5, 0.24],
      [0.64, 0.28], // the Water Jar
      [0.72, 0.36],
      [0.7, 0.18],
      [0.6, 0.58],
      [0.5, 0.74],
      [0.56, 0.9],
      [0.3, 0.74],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [3, 5],
      [2, 6],
      [6, 7],
      [7, 8],
      [6, 9],
    ],
    bright: [1, 2],
  },
  pisces: {
    // Two fish tied by long cords meeting at the knot, Alrescha.
    points: [
      [0.14, 0.86], // Alrescha — the knot
      [0.4, 0.76],
      [0.6, 0.68],
      [0.74, 0.62],
      [0.82, 0.54], // the Circlet
      [0.93, 0.6],
      [0.9, 0.71],
      [0.8, 0.7],
      [0.22, 0.6],
      [0.3, 0.36],
      [0.35, 0.14],
      [0.46, 0.08],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 3],
      [0, 8],
      [8, 9],
      [9, 10],
      [10, 11],
    ],
    bright: [0],
  },
  orion: {
    // The hunter: shoulders, head, the three-star belt and the knees.
    points: [
      [0.26, 0.18], // Betelgeuse
      [0.72, 0.22], // Bellatrix
      [0.4, 0.5],
      [0.5, 0.48],
      [0.6, 0.46],
      [0.3, 0.86], // Saiph
      [0.78, 0.82], // Rigel
      [0.5, 0.06], // Meissa
    ],
    lines: [
      [0, 7],
      [7, 1],
      [0, 2],
      [1, 4],
      [2, 3],
      [3, 4],
      [2, 5],
      [4, 6],
    ],
    bright: [0, 6],
  },
  ursaMajor: {
    // The Big Dipper: a bowl and a long bent handle.
    points: [
      [0.55, 0.44],
      [0.6, 0.7],
      [0.86, 0.72],
      [0.9, 0.44], // Dubhe
      [0.4, 0.38],
      [0.25, 0.4],
      [0.08, 0.3],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [0, 4],
      [4, 5],
      [5, 6],
    ],
    bright: [3],
  },
  ursaMinor: {
    // The Little Dipper hanging from Polaris.
    points: [
      [0.1, 0.2], // Polaris
      [0.28, 0.28],
      [0.42, 0.38],
      [0.56, 0.5],
      [0.72, 0.44],
      [0.9, 0.6],
      [0.75, 0.72],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3],
    ],
    bright: [0],
  },
  cassiopeia: {
    // The "W".
    points: [
      [0.08, 0.34],
      [0.3, 0.64],
      [0.5, 0.4],
      [0.7, 0.62],
      [0.92, 0.3],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
    bright: [2],
  },
  cygnus: {
    // The Northern Cross: Deneb at the tail, Albireo at the beak.
    points: [
      [0.5, 0.08], // Deneb
      [0.5, 0.44],
      [0.5, 0.92], // Albireo
      [0.14, 0.36],
      [0.86, 0.52],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [3, 1],
      [1, 4],
    ],
    bright: [0],
  },
  lyra: {
    // Vega and the small parallelogram of the lyre.
    points: [
      [0.48, 0.1], // Vega
      [0.66, 0.16],
      [0.4, 0.38],
      [0.62, 0.42],
      [0.58, 0.86],
      [0.36, 0.8],
    ],
    lines: [
      [0, 1],
      [0, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 2],
    ],
    bright: [0],
  },
  andromeda: {
    // The chained princess: a long chain with a branch toward the galaxy.
    points: [
      [0.1, 0.62], // Alpheratz
      [0.36, 0.54], // Mirach
      [0.6, 0.46],
      [0.88, 0.26], // Almach
      [0.4, 0.34],
      [0.44, 0.18],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [1, 4],
      [4, 5],
    ],
    bright: [0, 3],
  },
  pegasus: {
    // The Great Square with the horse's neck and forelegs.
    points: [
      [0.3, 0.3],
      [0.64, 0.3],
      [0.64, 0.64],
      [0.3, 0.64],
      [0.84, 0.76],
      [0.95, 0.62], // Enif — the nose
      [0.84, 0.16],
      [0.95, 0.28],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [2, 4],
      [4, 5],
      [1, 6],
      [6, 7],
    ],
    bright: [0, 5],
  },
  perseus: {
    // The hero's arc around Mirfak, with Algol hanging off the side.
    points: [
      [0.6, 0.08],
      [0.55, 0.25],
      [0.5, 0.42], // Mirfak
      [0.36, 0.56],
      [0.3, 0.75],
      [0.4, 0.9],
      [0.66, 0.6], // Algol
      [0.76, 0.76],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [2, 6],
      [6, 7],
    ],
    bright: [2, 6],
  },
  draco: {
    // A dragon's head (a small quadrilateral) and a long winding body.
    points: [
      [0.78, 0.14],
      [0.9, 0.22],
      [0.88, 0.36],
      [0.75, 0.3],
      [0.6, 0.4],
      [0.46, 0.56],
      [0.56, 0.72],
      [0.36, 0.82],
      [0.2, 0.62],
      [0.1, 0.44],
    ],
    lines: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
      [8, 9],
    ],
    bright: [2],
  },
  crux: {
    // The Southern Cross, with its small off-centre star.
    points: [
      [0.5, 0.08],
      [0.5, 0.92], // Acrux
      [0.2, 0.46],
      [0.78, 0.4],
      [0.62, 0.62],
    ],
    lines: [
      [0, 1],
      [2, 3],
    ],
    bright: [1],
  },
  canisMajor: {
    // The great dog with Sirius, the brightest star in the night sky, at its heart.
    points: [
      [0.44, 0.24], // Sirius
      [0.56, 0.08],
      [0.2, 0.32], // Mirzam
      [0.5, 0.46],
      [0.62, 0.6], // Wezen
      [0.55, 0.82], // Adhara
      [0.86, 0.56], // Aludra
    ],
    lines: [
      [0, 1],
      [0, 2],
      [0, 3],
      [3, 4],
      [4, 5],
      [4, 6],
    ],
    bright: [0],
  },
};

/** The art for a key, or null for an unknown one (a server key the app doesn't know yet). */
export function constellationArt(key: string | null | undefined): ConstellationArt | null {
  if (!key) return null;
  return (CONSTELLATION_ART as Record<string, ConstellationArt>)[key] ?? null;
}
