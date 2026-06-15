export enum EnergyState {
  Harmony = 'harmony',
  Momentum = 'momentum',
  Stress = 'stress',
  Overload = 'overload',
}

export enum RitualType {
  WaterProgramming = 'water_programming',
  KineticSync = 'kinetic_sync',
  Breathwork = 'breathwork',
  Grounding = 'grounding',
  LightExposure = 'light_exposure',
  FrequencyTuning = 'frequency_tuning',
}

export enum SynergyLevel {
  Alpha = 'alpha',
  Beta = 'beta',
  Gamma = 'gamma',
  Delta = 'delta',
  Omega = 'omega',
}

export interface FrequencyScore {
  value: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  synergyLevel: SynergyLevel;
}

export interface DailyAction {
  id: string;
  title: string;
  description: string;
  ritualType: RitualType;
  energyCost: number;
  frequencyBoost: number;
  durationMinutes: number;
  completed: boolean;
}

export interface Ritual {
  id: string;
  type: RitualType;
  title: string;
  description: string;
  streak: number;
  totalCompletions: number;
  lastCompletedAt: string | null;
  scoreMultiplier: number;
}

export interface AstrologicalSnapshot {
  sunSign: string;
  moonSign: string;
  risingSign: string;
  currentTransits: Transit[];
  dominantElement: string;
  dominantPlanet: string;
}

export interface Transit {
  planet: string;
  sign: string;
  house: number;
  aspect: string;
  natalPlanet: string;
  interpretation: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  energyState: EnergyState;
  frequencyScore: FrequencyScore;
  rituals: Ritual[];
  dailyActions: DailyAction[];
  astroSnapshot: AstrologicalSnapshot | null;
  createdAt: string;
  updatedAt: string;
}

export interface Circle {
  id: string;
  name: string;
  memberCount: number;
  collectiveFrequency: number;
  members: CircleMember[];
}

export interface CircleMember {
  id: string;
  displayName: string;
  energyState: EnergyState;
  frequencyScore: number;
  isOnline: boolean;
}
