import { Injectable } from '@nestjs/common';
import { AstrologyEngine } from './astrology-engine.service';
import { AIInsightEngine } from './ai-insight-engine.service';

@Injectable()
export class AstrologyService {
  constructor(
    private astrologyEngine: AstrologyEngine,
    private aiInsightEngine: AIInsightEngine,
  ) {}

  async getBirthChart(userId: string, birthDate: string, birthTime: string, lat: number, lng: number) {
    const chart = this.astrologyEngine.calculateBirthChart(birthDate, birthTime, lat, lng);
    return {
      sunSign: chart.sun.sign,
      moonSign: chart.moon.sign,
      risingSign: chart.rising.sign,
      risingDegree: Math.floor(chart.rising.degree),
      dominantElement: chart.dominantElement,
      dominantPlanet: chart.dominantPlanet,
      dominantModality: chart.dominantModality,
      houses: chart.houses.map((h) => ({
        house: h.house,
        sign: h.sign,
        degree: Math.floor(h.degree),
      })),
      planets: Object.entries(chart)
        .filter(([key]) =>
          ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(key),
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map(([key, pos]: [string, any]) => ({
          planet: pos.planet,
          sign: pos.sign,
          degree: Math.floor(pos.degree),
          house: pos.house,
          retrograde: pos.retrograde,
        })),
    };
  }

  async getCurrentTransits(userId: string) {
    const chart = this.astrologyEngine.calculateBirthChart('1990-01-01', '12:00', 41.0, 29.0);
    const transits = this.astrologyEngine.calculateCurrentTransits(chart);
    const scores = this.astrologyEngine.calculateDailyScores(chart);

    return {
      transits: transits.map((t) => ({
        planet: t.planet,
        currentSign: t.currentSign,
        aspect: t.aspect,
        natalPlanet: t.natalPlanet,
        orb: Math.round(t.orb * 10) / 10,
        interpretation: t.interpretation,
        action: this.aiInsightEngine.translateTransitToAction({
          planet: t.planet,
          currentSign: t.currentSign,
          aspect: t.aspect,
          natalPlanet: t.natalPlanet,
          interpretation: t.interpretation,
        }),
      })),
      scores: {
        harmony: scores.harmony,
        tension: scores.tension,
        energy: scores.energy,
        focus: scores.focus,
        creativity: scores.creativity,
      },
    };
  }

  async getDailyInsight(userId: string) {
    const chart = this.astrologyEngine.calculateBirthChart('1990-01-01', '12:00', 41.0, 29.0);
    const transits = this.astrologyEngine.calculateCurrentTransits(chart);

    const transitInputs = transits.map((t) => ({
      planet: t.planet,
      currentSign: t.currentSign,
      aspect: t.aspect,
      natalPlanet: t.natalPlanet,
      interpretation: t.interpretation,
    }));

    const insight = this.aiInsightEngine.generateDailyInsight(transitInputs, 742);
    const windows = this.astrologyEngine.calculateOptimalRitualWindows(chart);

    return {
      energyState: insight.energyState,
      title: insight.title,
      summary: insight.summary,
      actions: insight.actions,
      ritualWindows: windows,
      frequencyForecast: insight.frequencyForecast,
    };
  }

  async getAffirmations(userId: string) {
    const chart = this.astrologyEngine.calculateBirthChart('1990-01-01', '12:00', 41.0, 29.0);
    const transits = this.astrologyEngine.calculateCurrentTransits(chart);

    const transitInputs = transits.map((t) => ({
      planet: t.planet,
      currentSign: t.currentSign,
      aspect: t.aspect,
      natalPlanet: t.natalPlanet,
      interpretation: t.interpretation,
    }));

    return this.aiInsightEngine.generateAffirmationRecommendation(transitInputs);
  }
}
