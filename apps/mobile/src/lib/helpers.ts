import { RitualType, EnergyState, DailyAction, Ritual, FrequencyScore, SynergyLevel, Transit } from '@astroflow/shared';

export function getEnergyStateColor(state: EnergyState): string {
  const map: Record<EnergyState, string> = {
    [EnergyState.Harmony]: '#4DD6FF',
    [EnergyState.Momentum]: '#B14CFF',
    [EnergyState.Stress]: '#FF6B6B',
    [EnergyState.Overload]: '#FF4D4D',
  };
  return map[state];
}

export function getEnergyStateLabel(state: EnergyState): string {
  const map: Record<EnergyState, string> = {
    [EnergyState.Harmony]: 'Harmonic',
    [EnergyState.Momentum]: 'Kinetic',
    [EnergyState.Stress]: 'Pressured',
    [EnergyState.Overload]: 'Saturated',
  };
  return map[state];
}

export function getRitualLabel(type: RitualType): string {
  const map: Record<RitualType, string> = {
    [RitualType.WaterProgramming]: 'Water Programming',
    [RitualType.KineticSync]: 'Kinetic Sync',
    [RitualType.Breathwork]: 'Breathwork',
    [RitualType.Grounding]: 'Grounding',
    [RitualType.LightExposure]: 'Light Exposure',
    [RitualType.FrequencyTuning]: 'Frequency Tuning',
  };
  return map[type];
}

export function getSynergyLevelLabel(level: SynergyLevel): string {
  const map: Record<SynergyLevel, string> = {
    [SynergyLevel.Alpha]: 'Alpha',
    [SynergyLevel.Beta]: 'Beta',
    [SynergyLevel.Gamma]: 'Gamma',
    [SynergyLevel.Delta]: 'Delta',
    [SynergyLevel.Omega]: 'Omega',
  };
  return map[level];
}
