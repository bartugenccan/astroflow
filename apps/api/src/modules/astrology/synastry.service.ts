import { Injectable } from '@nestjs/common';
import {
  AstrologyAdapterService,
  BirthInput,
  SynastryAspect,
} from './astrology-adapter.service';
import {
  MAJOR_ASPECTS,
  SYNASTRY_PAIR_WEIGHT,
  SYNASTRY_CATEGORY_MAP,
  SYNASTRY_DIMENSIONS,
  SynastryCategory,
  SynastryDimensionKey,
  pairKey,
} from './astrology.constants';

export interface SynastryTopAspect extends SynastryAspect {
  categories: SynastryCategory[];
  weight: number;
}

export interface SynastryDimensionScore {
  key: SynastryDimensionKey;
  value: number; // 0-100
  lowerIsBetter: boolean;
}

export interface CompatibilityScore {
  overall: number; // 0-100 (higher = better; lower-is-better dims are inverted here)
  dimensions: SynastryDimensionScore[]; // the SAME 7 for every couple
  topAspects: SynastryTopAspect[];
  aspectCount: number;
}

const ORB_ALLOWANCE: Record<string, number> = Object.fromEntries(
  MAJOR_ASPECTS.map((a) => [a.name, a.orb]),
);

// Scale constants tuned so a strong pairing lands ~80-90 and a weak one ~30-40.
const K_POS = 45; // positive dimensions
const K_NEG = 70; // lower-is-better (conflict/enmeshment) dimensions

@Injectable()
export class SynastryService {
  constructor(private readonly adapter: AstrologyAdapterService) {}

  compute(self: BirthInput, other: BirthInput): CompatibilityScore {
    const aspects = this.adapter.getSynastryAspects(self, other);

    // Index emitted aspects by canonical pair → tightest hit for that pair.
    const byPair = new Map<string, SynastryAspect>();
    for (const a of aspects) {
      const key = pairKey(a.planetA, a.planetB);
      const prev = byPair.get(key);
      if (!prev || a.orb < prev.orb) byPair.set(key, a);
    }

    const dimensions: SynastryDimensionScore[] = SYNASTRY_DIMENSIONS.map((dim) => {
      let sum = 0;
      for (const [p1, p2] of dim.pairs) {
        const hit = byPair.get(pairKey(p1, p2));
        if (!hit) continue; // no in-orb contact → neutral baseline (contributes 0)
        const allowance = ORB_ALLOWANCE[hit.aspect] ?? 7;
        const tightness = Math.max(0, 1 - hit.orb / allowance);
        if (dim.lowerIsBetter) {
          // Any strong contact adds tension; hard contacts weigh most.
          const w =
            hit.nature === 'challenging' ? 1 : hit.aspect === 'Conjunction' ? 0.7 : hit.nature === 'neutral' ? 0.4 : 0.2;
          sum += tightness * w;
        } else {
          const polarity = hit.nature === 'harmonic' ? 1 : hit.nature === 'challenging' ? -1 : 0.5;
          sum += tightness * polarity;
        }
      }
      const avg = sum / dim.pairs.length;
      const value = dim.lowerIsBetter
        ? clamp(20 + K_NEG * avg)
        : clamp(50 + K_POS * avg);
      return { key: dim.key, value, lowerIsBetter: dim.lowerIsBetter };
    });

    // Weighted blend; lower-is-better dims contribute their inverse.
    let weighted = 0;
    let totalW = 0;
    for (const dim of SYNASTRY_DIMENSIONS) {
      const score = dimensions.find((d) => d.key === dim.key)!;
      const contribution = dim.lowerIsBetter ? 100 - score.value : score.value;
      weighted += contribution * dim.weight;
      totalW += dim.weight;
    }
    const overall = clamp(weighted / totalW);

    const topAspects: SynastryTopAspect[] = aspects
      .map((a) => {
        const key = pairKey(a.planetA, a.planetB);
        return {
          ...a,
          categories: SYNASTRY_CATEGORY_MAP[key] ?? ['love', 'communication'],
          weight: SYNASTRY_PAIR_WEIGHT[key] ?? 1,
        };
      })
      .sort((a, b) => this.strength(b) - this.strength(a))
      .slice(0, 8);

    return { overall, dimensions, topAspects, aspectCount: aspects.length };
  }

  private strength(a: SynastryTopAspect): number {
    const allowance = ORB_ALLOWANCE[a.aspect] ?? 7;
    const tightness = Math.max(0, 1 - a.orb / allowance);
    return a.weight * tightness;
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
