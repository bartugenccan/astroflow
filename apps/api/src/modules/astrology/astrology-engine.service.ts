import { Injectable } from '@nestjs/common';

export interface PlanetPosition {
  planet: string;
  sign: string;
  degree: number;
  minute: number;
  house: number;
  retrograde: boolean;
}

export interface HouseCusp {
  house: number;
  sign: string;
  degree: number;
  minute: number;
}

export interface BirthChart {
  sun: PlanetPosition;
  moon: PlanetPosition;
  mercury: PlanetPosition;
  venus: PlanetPosition;
  mars: PlanetPosition;
  jupiter: PlanetPosition;
  saturn: PlanetPosition;
  uranus: PlanetPosition;
  neptune: PlanetPosition;
  pluto: PlanetPosition;
  rising: HouseCusp;
  midheaven: HouseCusp;
  houses: HouseCusp[];
  dominantElement: string;
  dominantPlanet: string;
  dominantModality: string;
}

export interface Transit {
  planet: string;
  currentSign: string;
  currentDegree: number;
  natalPlanet: string;
  natalSign: string;
  aspect: string;
  orb: number;
  interpretation: string;
}

export interface AspectScore {
  harmony: number;
  tension: number;
  energy: number;
  focus: number;
  creativity: number;
}

const SIGNS: string[] = [
  'Koc', 'Boga', 'Ikizler', 'Yengec', 'Aslan', 'Basak',
  'Terazi', 'Akrep', 'Yay', 'Oglak', 'Kova', 'Balik',
];

const PLANETS: string[] = [
  'gunes', 'ay', 'merkur', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptun', 'pluton',
];

const ASPECTS = [
  { name: 'Kavusum', angle: 0, orb: 8, nature: 'neutral' },
  { name: 'Sekstil', angle: 60, orb: 6, nature: 'harmonious' },
  { name: 'Kare', angle: 90, orb: 8, nature: 'tense' },
  { name: 'Ucgen', angle: 120, orb: 8, nature: 'harmonious' },
  { name: 'Karsit', angle: 180, orb: 8, nature: 'tense' },
  { name: 'Quintile', angle: 72, orb: 2, nature: 'creative' },
  { name: 'Biquintile', angle: 144, orb: 2, nature: 'creative' },
];

const ELEMENT_MAP: Record<string, string> = {
  'Koc': 'ates', 'Boga': 'toprak', 'Ikizler': 'hava', 'Yengec': 'su',
  'Aslan': 'ates', 'Basak': 'toprak', 'Terazi': 'hava', 'Akrep': 'su',
  'Yay': 'ates', 'Oglak': 'toprak', 'Kova': 'hava', 'Balik': 'su',
};

const MODALITY_MAP: Record<string, string> = {
  'Koc': 'oncu', 'Boga': 'sabit', 'Ikizler': 'degisken', 'Yengec': 'oncu',
  'Aslan': 'sabit', 'Basak': 'degisken', 'Terazi': 'oncu', 'Akrep': 'sabit',
  'Yay': 'degisken', 'Oglak': 'oncu', 'Kova': 'sabit', 'Balik': 'degisken',
};

const PLANET_SIGNIFICANCE: Record<string, string[]> = {
  'gunes': ['oz kimlik', 'ego', 'yasam amaci', 'yaraticilik', 'iradem'],
  'ay': ['duygular', 'ic dunya', 'sezgiler', 'anne', 'guvenlik'],
  'merkur': ['iletisim', 'zeka', 'ogrenme', 'ticaret', 'analiz'],
  'venus': ['ask', 'guzellik', 'degerler', 'sanat', 'iliski'],
  'mars': ['eylem', 'cesaret', 'arzular', 'rekabet', 'fiziksel guc'],
  'jupiter': ['buyume', 'sans', 'bilgelik', 'genisleme', 'iyimserlik'],
  'saturn': ['disiplin', 'sorumluluk', 'sinirlar', 'olgunluk', 'yapilandirma'],
  'uranus': ['ozgurluk', 'devrim', 'yenilik', 'sezgi', 'anilik'],
  'neptun': ['hayaller', 'ruhsallik', 'ilham', 'sefkats', 'cozulme'],
  'pluton': ['donusum', 'guc', 'derinlik', 'yeniden dogus', 'gizem'],
};

const PLANET_ORBITAL_PERIODS: Record<string, number> = {
  'merkur': 87.969,
  'venus': 224.701,
  'mars': 686.980,
  'jupiter': 4332.589,
  'saturn': 10759.22,
  'uranus': 30688.5,
  'neptun': 60182.0,
  'pluton': 90560.0,
};

const PLANET_MEAN_ANOMALY_J2000: Record<string, number> = {
  'merkür': 168.6562,
  'venüs': 181.9798,
  'mars': 19.3879,
  'jüpiter': 19.8950,
  'satürn': 316.9670,
  'uranüs': 142.5905,
  'neptün': 259.9132,
  'pluto': 14.8600,
};

const SIGN_RANGES: { sign: string; start: number }[] = SIGNS.map((sign, i) => ({
  sign,
  start: i * 30,
}));

@Injectable()
export class AstrologyEngine {

  calculateBirthChart(
    birthDate: string,
    birthTime: string,
    latitude: number,
    longitude: number,
  ): BirthChart {
    const jd = this.toJulianDate(birthDate, birthTime);
    const [hour, minute] = birthTime.split(':').map(Number);
    const utHours = hour + minute / 60.0;

    const siderealTime = this.calculateSiderealTime(jd, longitude);
    const ascendantEclipticDeg = this.calculateAscendant(siderealTime, latitude);
    const midheavenDeg = this.calculateMidheaven(siderealTime);

    const houses = this.calculateHouses(ascendantEclipticDeg);
    const planets = this.calculatePlanetPositions(jd);

    const planetPositions = planets.map((pos) => ({
      planet: pos.planet,
      sign: pos.sign,
      degree: pos.degree,
      minute: pos.minute,
      house: this.findHouseForDegree(pos.eclipticLongitude, houses),
      retrograde: pos.retrograde,
    }));

    const risingSign = this.degreeToSign(ascendantEclipticDeg);
    const risingDegree = ascendantEclipticDeg % 30;
    const risingMinutes = (risingDegree - Math.floor(risingDegree)) * 60;

    const mcSign = this.degreeToSign(midheavenDeg);
    const mcDegree = midheavenDeg % 30;
    const mcMinutes = (mcDegree - Math.floor(mcDegree)) * 60;

    const byPlanet: Record<string, PlanetPosition> = {};
    for (const pp of planetPositions) {
      byPlanet[pp.planet] = pp;
    }

    const dominantElement = this.calculateDominantElement(planetPositions);
    const dominantPlanet = this.calculateDominantPlanet(planetPositions);
    const dominantModality = this.calculateDominantModality(planetPositions);

    return {
      sun: byPlanet['gunes'],
      moon: byPlanet['ay'],
      mercury: byPlanet['merkur'],
      venus: byPlanet['venus'],
      mars: byPlanet['mars'],
      jupiter: byPlanet['jupiter'],
      saturn: byPlanet['saturn'],
      uranus: byPlanet['uranus'],
      neptune: byPlanet['neptun'],
      pluto: byPlanet['pluton'],
      rising: {
        house: 1,
        sign: risingSign,
        degree: Math.floor(risingDegree),
        minute: Math.floor(risingMinutes),
      },
      midheaven: {
        house: 10,
        sign: mcSign,
        degree: Math.floor(mcDegree),
        minute: Math.floor(mcMinutes),
      },
      houses: houses.map((h) => ({
        house: h.house,
        sign: h.sign,
        degree: h.degree,
        minute: h.minute,
      })),
      dominantElement,
      dominantPlanet,
      dominantModality,
    };
  }

  calculateCurrentTransits(chart: BirthChart): Transit[] {
    const now = new Date();
    const nowUtc = new Date(now.toISOString());
    const dateStr = nowUtc.toISOString().split('T')[0];
    const timeStr = nowUtc.toISOString().split('T')[1].substring(0, 5);
    const jd = this.toJulianDate(dateStr, timeStr);

    const currentPlanets = this.calculatePlanetPositions(jd);
    const natalPlanetList = this.getNatalPlanetList(chart);

    const transits: Transit[] = [];

    for (const cp of currentPlanets) {
      const natal = natalPlanetList.find(
        (n) => n.planet === cp.planet,
      );
      if (!natal) continue;

      const aspect = this.getAspect(cp.eclipticLongitude, natal.eclipticLongitude);
      if (!aspect) continue;

      transits.push({
        planet: cp.planet,
        currentSign: cp.sign,
        currentDegree: Math.floor(cp.degree),
        natalPlanet: natal.planet,
        natalSign: natal.sign,
        aspect: aspect.name,
        orb: aspect.orb,
        interpretation: this.generateTransitInterpretation(
          cp.planet,
          natal.planet,
          aspect.name,
          aspect.nature,
        ),
      });
    }

    return transits;
  }

  calculateDailyScores(chart: BirthChart): AspectScore {
    const transits = this.calculateCurrentTransits(chart);

    let harmony = 0;
    let tension = 0;
    let energy = 0;
    let focus = 0;
    let creativity = 0;

    for (const transit of transits) {
      const impact = Math.max(0, 10 - transit.orb);

      switch (transit.aspect) {
        case 'Ucgen':
        case 'Sekstil':
          harmony += impact * 6;
          energy += impact * 2;
          break;
        case 'Kare':
        case 'Karsit':
          tension += impact * 5;
          energy += impact * 4;
          focus += impact * 2;
          break;
        case 'Kavusum':
          energy += impact * 5;
          focus += impact * 3;
          creativity += impact * 2;
          break;
        case 'Quintile':
        case 'Biquintile':
          creativity += impact * 7;
          harmony += impact * 2;
          break;
      }
    }

    const moonNatal = chart.moon;
    const sunNatal = chart.sun;
    const lunarPhaseImpact = 5 + Math.abs(sunNatal.degree - moonNatal.degree) % 30 * 0.3;
    energy += Math.round(lunarPhaseImpact);

    return {
      harmony: Math.min(100, Math.round(harmony)),
      tension: Math.min(100, Math.round(tension)),
      energy: Math.min(100, Math.round(energy)),
      focus: Math.min(100, Math.round(focus)),
      creativity: Math.min(100, Math.round(creativity)),
    };
  }

  calculateOptimalRitualWindows(
    chart: BirthChart,
  ): { start: string; end: string; ritualType: string; quality: string }[] {
    const windows: { start: string; end: string; ritualType: string; quality: string }[] = [];
    const now = new Date();

    const ritualConfigs = [
      { hour: 5, minute: 30, duration: 45, ritualType: 'NEFES', planet: 'gunes' },
      { hour: 7, minute: 0, duration: 30, ritualType: 'TOPRAKLANMA', planet: 'gunes' },
      { hour: 12, minute: 0, duration: 20, ritualType: 'HAREKET', planet: 'mars' },
      { hour: 17, minute: 0, duration: 25, ritualType: 'SU_PROGRAMLAMA', planet: 'ay' },
      { hour: 20, minute: 0, duration: 30, ritualType: 'DALGALANMA', planet: 'ay' },
      { hour: 22, minute: 30, duration: 20, ritualType: 'NEFES', planet: 'saturn' },
    ];

    const housePlanetRitualMap: Record<number, string[]> = {
      1: ['NEFES', 'HAREKET'],
      2: ['SU_PROGRAMLAMA', 'TOPRAKLANMA'],
      3: ['DALGALANMA', 'NEFES'],
      4: ['TOPRAKLANMA', 'SU_PROGRAMLAMA'],
      5: ['HAREKET', 'DALGALANMA'],
      6: ['NEFES', 'TOPRAKLANMA'],
      7: ['SU_PROGRAMLAMA', 'DALGALANMA'],
      8: ['NEFES', 'HAREKET'],
      9: ['DALGALANMA', 'SU_PROGRAMLAMA'],
      10: ['TOPRAKLANMA', 'HAREKET'],
      11: ['NEFES', 'DALGALANMA'],
      12: ['SU_PROGRAMLAMA', 'NEFES'],
    };

    const sunHouse = chart.sun.house;
    const inherentRituals = housePlanetRitualMap[sunHouse] || ['NEFES', 'TOPRAKLANMA'];

    for (const config of ritualConfigs) {
      const start = new Date(now);
      start.setHours(config.hour, config.minute, 0, 0);
      const end = new Date(start.getTime() + config.duration * 60000);

      const startStr = start.toISOString();
      const endStr = end.toISOString();

      const isInherent = inherentRituals.includes(config.ritualType);
      const quality = isInherent ? 'yuksek' : 'orta';

      windows.push({
        start: startStr,
        end: endStr,
        ritualType: config.ritualType,
        quality,
      });
    }

    return windows;
  }

  private toJulianDate(dateStr: string, timeStr: string): number {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);

    let y = year;
    let m = month;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }

    const a = Math.floor(y / 100);
    const b = 2 - a + Math.floor(a / 4);

    const jd =
      Math.floor(365.25 * (y + 4716)) +
      Math.floor(30.6001 * (m + 1)) +
      day +
      (hour + minute / 60.0) / 24.0 +
      b -
      1524.5;

    return jd;
  }

  private calculateSiderealTime(jd: number, longitude: number): number {
    const T = (jd - 2451545.0) / 36525.0;

    let gmst =
      280.46061837 +
      360.98564736629 * (jd - 2451545.0) +
      0.000387933 * T * T -
      (T * T * T) / 38710000.0;

    gmst = gmst % 360;
    if (gmst < 0) gmst += 360;

    const lmst = gmst + longitude;
    return ((lmst % 360) + 360) % 360;
  }

  private calculateAscendant(siderealTime: number, latitude: number): number {
    const radLat = (latitude * Math.PI) / 180.0;
    const obliquity = 23.439291 * (Math.PI / 180.0);

    const ramc = (siderealTime * Math.PI) / 180.0;
    const x = -Math.cos(ramc) * Math.sin(obliquity) * Math.tan(radLat);
    const y = -Math.sin(ramc);
    const ascRad = Math.atan2(y, x);

    let ascDeg = (ascRad * 180.0) / Math.PI;
    if (ascDeg < 0) ascDeg += 360;

    return ascDeg;
  }

  private calculateMidheaven(siderealTime: number): number {
    const ramc = (siderealTime * Math.PI) / 180.0;
    const obliquity = 23.439291 * (Math.PI / 180.0);

    const mcRad = Math.atan2(
      Math.sin(ramc) * Math.cos(obliquity),
      Math.cos(ramc),
    );

    let mcDeg = (mcRad * 180.0) / Math.PI;
    if (mcDeg < 0) mcDeg += 360;

    return mcDeg;
  }

  private calculateHouses(ascEclipticDeg: number): { house: number; sign: string; degree: number; minute: number }[] {
    const houses: { house: number; sign: string; degree: number; minute: number }[] = [];

    for (let i = 0; i < 12; i++) {
      const houseDeg = (ascEclipticDeg + i * 30) % 360;
      const sign = this.degreeToSign(houseDeg);
      const degreeInSign = houseDeg % 30;
      const minutes = (degreeInSign - Math.floor(degreeInSign)) * 60;

      houses.push({
        house: i + 1,
        sign,
        degree: Math.floor(degreeInSign),
        minute: Math.floor(minutes),
      });
    }

    return houses;
  }

  private calculatePlanetPositions(
    jd: number,
  ): { planet: string; sign: string; degree: number; minute: number; eclipticLongitude: number; retrograde: boolean }[] {
    const T = (jd - 2451545.0) / 36525.0;
    const positions: { planet: string; sign: string; degree: number; minute: number; eclipticLongitude: number; retrograde: boolean }[] = [];

    const sunL = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360;
    const sunAnomaly = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) % 360;
    const sunCenter =
      (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin((sunAnomaly * Math.PI) / 180.0) +
      0.019993 * Math.sin((2 * sunAnomaly * Math.PI) / 180.0) +
      0.000289 * Math.sin((3 * sunAnomaly * Math.PI) / 180.0);
    const sunLongitude = (sunL + sunCenter) % 360;

    const sunSign = this.degreeToSign(sunLongitude);
    const sunDegInSign = sunLongitude % 30;
    positions.push({
      planet: 'gunes',
      sign: sunSign,
      degree: Math.floor(sunDegInSign),
      minute: Math.floor((sunDegInSign - Math.floor(sunDegInSign)) * 60),
      eclipticLongitude: sunLongitude,
      retrograde: false,
    });

    const moonL = (218.3165 + 481267.8813 * T) % 360;
    const moonAnomaly = (134.96298 + 477198.867398 * T) % 360;
    const moonElongation = (297.8502 + 445267.1115 * T) % 360;
    const moonSunDist = (93.27191 + 483202.0175 * T) % 360;

    const moonLat =
      -1.274 * Math.sin(((moonAnomaly - moonElongation) * Math.PI) / 180.0) +
      0.658 * Math.sin(((moonElongation) * Math.PI) / 180.0) -
      0.186 * Math.sin(((moonSunDist) * Math.PI) / 180.0) -
      0.059 * Math.sin(((2 * moonElongation - moonAnomaly) * Math.PI) / 180.0) -
      0.057 * Math.sin(((moonAnomaly - 2 * moonElongation) * Math.PI) / 180.0);

    const moonLon =
      moonL +
      moonLat +
      0.000233 * Math.sin(((51.2 + 20.2 * T) * Math.PI) / 180.0);
    const moonLongitude = moonLon % 360;

    const moonSign = this.degreeToSign(moonLongitude);
    const moonDegInSign = moonLongitude % 30;
    positions.push({
      planet: 'ay',
      sign: moonSign,
      degree: Math.floor(moonDegInSign),
      minute: Math.floor((moonDegInSign - Math.floor(moonDegInSign)) * 60),
      eclipticLongitude: moonLongitude,
      retrograde: false,
    });

    const planetOrbitalElements: Record<string, { L: number; a: number; e: number; i: number; W: number; w: number }> = {
      'merkür': { L: 252.2509, a: 0.387099, e: 0.205631, i: 7.00499, W: 48.3313, w: 29.12478 },
      'venüs': { L: 181.9798, a: 0.723332, e: 0.006773, i: 3.39466, W: 76.6799, w: 55.186 },
      'mars': { L: 355.4530, a: 1.523688, e: 0.093405, i: 1.84973, W: 49.5574, w: 286.502 },
      'jüpiter': { L: 34.40438, a: 5.202560, e: 0.048498, i: 1.30361, W: 100.454, w: 273.868 },
      'satürn': { L: 49.94432, a: 9.554747, e: 0.055508, i: 2.48888, W: 113.663, w: 339.391 },
      'uranüs': { L: 313.2381, a: 19.21814, e: 0.046295, i: 0.77320, W: 74.0059, w: 96.541 },
      'neptün': { L: 55.1203, a: 30.10957, e: 0.008988, i: 1.77004, W: 131.784, w: 265.647 },
      'pluto': { L: 238.9290, a: 39.481686, e: 0.248808, i: 17.14175, W: 110.307, w: 113.763 },
    };

    for (const [planetKey, elems] of Object.entries(planetOrbitalElements)) {
      const n = (360.0 / PLANET_ORBITAL_PERIODS[planetKey]) / 365.25;
      const M = ((elems.L - elems.w + n * (jd - 2451545.0)) % 360 + 360) % 360;
      const Mrad = (M * Math.PI) / 180.0;
      const e = elems.e;

      let E = Mrad;
      for (let i = 0; i < 10; i++) {
        E = E - (E - e * Math.sin(E) - Mrad) / (1 - e * Math.cos(E));
      }

      const cosE = Math.cos(E);
      const sinE = Math.sin(E);

      const xOrb = elems.a * (cosE - e);
      const yOrb = elems.a * Math.sqrt(1 - e * e) * sinE;
      const v = Math.atan2(yOrb, xOrb);

      const retrograde = Math.cos(v + (elems.w * Math.PI) / 180.0) > 0.95 && M > 170 && M < 190;

      const Lrad = ((elems.L + (n * (jd - 2451545.0) * 180.0) / Math.PI) % 360 + 360) % 360;
      const eclipticLongitude = (Lrad + (elems.w - elems.L) + ((v * 180.0) / Math.PI)) % 360;

      const planetName: Record<string, string> = {
        'merkür': 'merkur',
        'venüs': 'venus',
        'mars': 'mars',
        'jüpiter': 'jupiter',
        'satürn': 'saturn',
        'uranüs': 'uranus',
        'neptün': 'neptun',
        'pluto': 'pluton',
      };

      const normalizedLon = ((eclipticLongitude % 360) + 360) % 360;
      const sign = this.degreeToSign(normalizedLon);
      const degInSign = normalizedLon % 30;

      positions.push({
        planet: planetName[planetKey] || planetKey,
        sign,
        degree: Math.floor(degInSign),
        minute: Math.floor((degInSign - Math.floor(degInSign)) * 60),
        eclipticLongitude: normalizedLon,
        retrograde,
      });
    }

    return positions;
  }

  private degreeToSign(degree: number): string {
    const normalized = ((degree % 360) + 360) % 360;
    const index = Math.floor(normalized / 30);
    return SIGNS[Math.min(index, 11)];
  }

  private getNatalPlanetList(
    chart: BirthChart,
  ): { planet: string; sign: string; eclipticLongitude: number }[] {
    return [
      { planet: 'gunes', sign: chart.sun.sign, eclipticLongitude: this.signDegreeToEcliptic(chart.sun.sign, chart.sun.degree, chart.sun.minute) },
      { planet: 'ay', sign: chart.moon.sign, eclipticLongitude: this.signDegreeToEcliptic(chart.moon.sign, chart.moon.degree, chart.moon.minute) },
      { planet: 'merkur', sign: chart.mercury.sign, eclipticLongitude: this.signDegreeToEcliptic(chart.mercury.sign, chart.mercury.degree, chart.mercury.minute) },
      { planet: 'venus', sign: chart.venus.sign, eclipticLongitude: this.signDegreeToEcliptic(chart.venus.sign, chart.venus.degree, chart.venus.minute) },
      { planet: 'mars', sign: chart.mars.sign, eclipticLongitude: this.signDegreeToEcliptic(chart.mars.sign, chart.mars.degree, chart.mars.minute) },
      { planet: 'jupiter', sign: chart.jupiter.sign, eclipticLongitude: this.signDegreeToEcliptic(chart.jupiter.sign, chart.jupiter.degree, chart.jupiter.minute) },
      { planet: 'saturn', sign: chart.saturn.sign, eclipticLongitude: this.signDegreeToEcliptic(chart.saturn.sign, chart.saturn.degree, chart.saturn.minute) },
      { planet: 'uranus', sign: chart.uranus.sign, eclipticLongitude: this.signDegreeToEcliptic(chart.uranus.sign, chart.uranus.degree, chart.uranus.minute) },
      { planet: 'neptun', sign: chart.neptune.sign, eclipticLongitude: this.signDegreeToEcliptic(chart.neptune.sign, chart.neptune.degree, chart.neptune.minute) },
      { planet: 'pluton', sign: chart.pluto.sign, eclipticLongitude: this.signDegreeToEcliptic(chart.pluto.sign, chart.pluto.degree, chart.pluto.minute) },
    ];
  }

  private signDegreeToEcliptic(sign: string, degree: number, minute: number): number {
    const signIndex = SIGNS.indexOf(sign);
    if (signIndex === -1) return 0;
    return signIndex * 30 + degree + minute / 60.0;
  }

  private getAspect(
    currentLong: number,
    natalLong: number,
  ): { name: string; orb: number; nature: string } | null {
    let diff = Math.abs(currentLong - natalLong);
    if (diff > 180) diff = 360 - diff;

    for (const aspect of ASPECTS) {
      const angleDiff = Math.abs(diff - aspect.angle);
      if (angleDiff <= aspect.orb) {
        return { name: aspect.name, orb: angleDiff, nature: aspect.nature };
      }
    }

    return null;
  }

  private generateTransitInterpretation(
    transitingPlanet: string,
    natalPlanet: string,
    aspectName: string,
    aspectNature: string,
  ): string {
    const transitKeywords = PLANET_SIGNIFICANCE[transitingPlanet] || [transitingPlanet];
    const natalKeywords = PLANET_SIGNIFICANCE[natalPlanet] || [natalPlanet];

    const transitWord = transitKeywords[0];
    const natalWord = natalKeywords[0];

    const aspectInterpretations: Record<string, string[]> = {
      'harmonious': [
        `${transitingPlanet} transit ${natalWord} alaninda uyumlu bir aki yaratiyor`,
        `${transitWord} enerjin ${natalWord} ile destekleniyor`,
      ],
      'tense': [
        `${transitingPlanet} transit ${natalWord} konusunda gerilim yaratiyor`,
        `${transitWord} ve ${natalWord} arasinda surtusme var`,
      ],
      'neutral': [
        `${transitingPlanet} ve ${natalWord} enerjisi birlesiyor`,
        `${transitWord} ile ${natalWord} yeni bir sentez olusuyor`,
      ],
      'creative': [
        `${transitingPlanet} transit ${natalWord} icin yaratici bir pencere aciyor`,
        `${transitWord} enerjin ${natalWord} alaninda ilham getiriyor`,
      ],
    };

    const options = aspectInterpretations[aspectNature] || aspectInterpretations['neutral'];
    const base = options[Math.floor(Math.floor(Math.random() * 100) % options.length)];

    return `${base}. ${aspectName} acisi: ${Math.round(Math.random() * 4 + 1)}° orb.`;
  }

  private findHouseForDegree(
    eclipticDeg: number,
    houses: { house: number; sign: string; degree: number; minute: number }[],
  ): number {
    for (let i = 0; i < houses.length; i++) {
      const houseStart = this.signDegreeToEcliptic(
        houses[i].sign,
        houses[i].degree,
        houses[i].minute,
      );
      const nextHouseStart = this.signDegreeToEcliptic(
        houses[(i + 1) % houses.length].sign,
        houses[(i + 1) % houses.length].degree,
        houses[(i + 1) % houses.length].minute,
      );

      if (houseStart < nextHouseStart) {
        if (eclipticDeg >= houseStart && eclipticDeg < nextHouseStart) {
          return houses[i].house;
        }
      } else {
        if (eclipticDeg >= houseStart || eclipticDeg < nextHouseStart) {
          return houses[i].house;
        }
      }
    }
    return 1;
  }

  private calculateDominantElement(
    planetPositions: { planet: string; sign: string; degree: number; minute: number; house: number; retrograde: boolean }[],
  ): string {
    const elementScores: Record<string, number> = { 'ates': 0, 'toprak': 0, 'hava': 0, 'su': 0 };
    const weights: Record<string, number> = {
      'gunes': 4, 'ay': 4, 'merkur': 2, 'venus': 2, 'mars': 2,
      'jupiter': 2, 'saturn': 2, 'uranus': 1, 'neptun': 1, 'pluton': 1,
    };

    for (const pp of planetPositions) {
      const element = ELEMENT_MAP[pp.sign];
      elementScores[element] = (elementScores[element] || 0) + (weights[pp.planet] || 1);
    }

    let maxScore = 0;
    let dominant = 'ates';
    for (const [element, score] of Object.entries(elementScores)) {
      if (score > maxScore) {
        maxScore = score;
        dominant = element;
      }
    }

    return dominant;
  }

  private calculateDominantPlanet(
    planetPositions: { planet: string; sign: string; degree: number; minute: number; house: number; retrograde: boolean }[],
  ): string {
    const signRulers: Record<string, string> = {
      'Koc': 'mars', 'Boga': 'venus', 'Ikizler': 'merkur', 'Yengec': 'ay',
      'Aslan': 'gunes', 'Basak': 'merkur', 'Terazi': 'venus', 'Akrep': 'pluton',
      'Yay': 'jupiter', 'Oglak': 'saturn', 'Kova': 'uranus', 'Balik': 'neptun',
    };

    const planetScores: Record<string, number> = {};
    const dignityWeights: Record<number, number> = { 1: 5, 4: 4, 7: 4, 10: 5 };

    for (const pp of planetPositions) {
      const ruler = signRulers[pp.sign];
      planetScores[ruler] = (planetScores[ruler] || 0) + 2;

      const houseWeight = dignityWeights[pp.house] || 1;
      planetScores[pp.planet] = (planetScores[pp.planet] || 0) + houseWeight;
    }

    let maxScore = 0;
    let dominant = 'gunes';
    for (const [planet, score] of Object.entries(planetScores)) {
      if (score > maxScore) {
        maxScore = score;
        dominant = planet;
      }
    }

    return dominant;
  }

  private calculateDominantModality(
    planetPositions: { planet: string; sign: string; degree: number; minute: number; house: number; retrograde: boolean }[],
  ): string {
    const modalityScores: Record<string, number> = { 'oncu': 0, 'sabit': 0, 'degisken': 0 };
    const weights: Record<string, number> = {
      'gunes': 3, 'ay': 3, 'merkur': 2, 'venus': 2, 'mars': 2,
      'jupiter': 1, 'saturn': 1, 'uranus': 1, 'neptun': 1, 'pluton': 1,
    };

    for (const pp of planetPositions) {
      const modality = MODALITY_MAP[pp.sign];
      modalityScores[modality] = (modalityScores[modality] || 0) + (weights[pp.planet] || 1);
    }

    let maxScore = 0;
    let dominant = 'oncu';
    for (const [modality, score] of Object.entries(modalityScores)) {
      if (score > maxScore) {
        maxScore = score;
        dominant = modality;
      }
    }

    return dominant;
  }
}
