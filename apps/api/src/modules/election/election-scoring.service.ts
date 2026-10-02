import { Injectable } from '@nestjs/common';
import { EphemerisService, RawHoroscope, RawPoint } from '../astrology/ephemeris.service';
import {
  ASPECT_NATURE,
  MODALITY_BY_SIGN,
  PLANETS,
  Planet,
  Sign,
  TRADITIONAL_SIGN_RULER,
  absToSign,
  matchAspect,
} from '../astrology/astrology.constants';
import { Locale } from '../astrology/interpretation.types';
import { addDays, norm, sep, signed } from '../astrology/sky-scan';

export { addDays };
import { ElectionProfile } from './election.events';
import {
  ElectionAlternative,
  ElectionAvoid,
  ElectionDay,
  ElectionFactor,
  ElectionHourWindow,
  ElectionPick,
  ElectionVerdict,
} from './election.types';
import {
  MoonPhaseKey,
  combustLabel,
  eclipseLabel,
  eclipseShort,
  houseHighlight,
  moonAspectLabel,
  moonPhaseLabel,
  moonSignLabel,
  natalLabel,
  retrogradeLabel,
  retrogradeShort,
  risingHighlight,
  vocLabel,
} from './election.labels';

/** Positions the scan reads at one instant. */
interface Sky {
  t: number; // UTC ms
  lon: Record<Planet, number>;
  retro: Record<Planet, boolean>;
  node: number;
}

interface MoonEvent {
  t: number;
  type: 'ingress' | 'aspect';
  planet?: Planet;
  aspect?: string;
}

/** Everything one request computes against: the place, the person, and a sky cache shared across days. */
export interface ScanContext {
  latitude: number;
  longitude: number;
  natal: Record<Planet, number>;
  profile: ElectionProfile;
  locale: Locale;
  skies: Map<string, Sky>;
}

/** A scored day plus the raw facts the search needs for its "avoid" list. */
interface DayDetail extends ElectionDay {
  retro: Partial<Record<Planet, boolean>>;
  eclipse: { kind: 'solar' | 'lunar'; date: string } | null;
  voc: { from: number; to: number }[];
}

const DAY_MS = 86_400_000;
/** Aspects the Moon perfects, as angles of separation it passes through while it moves ahead. */
const MOON_ASPECT_ANGLES: [number, string][] = [
  [0, 'Conjunction'], [60, 'Sextile'], [90, 'Square'], [120, 'Trine'], [180, 'Opposition'],
  [240, 'Trine'], [270, 'Square'], [300, 'Sextile'],
];
const OTHER_PLANETS = PLANETS.filter((p) => p !== 'Moon');
const BENEFICS: Planet[] = ['Venus', 'Jupiter'];
const MALEFICS: Planet[] = ['Mars', 'Saturn'];
const OUTER: Planet[] = ['Uranus', 'Neptune', 'Pluto'];
/** Eclipses happen when a lunation falls within this many degrees of the lunar nodes. */
const ECLIPSE_NODE_ORB = 17;
/** Within this separation from the Sun a planet is "combust" (burned up, weakened). */
const COMBUST_ORB = 8.5;
const BASE_SCORE = 60;
/** Local hours scanned for the event chart (07:00 … 22:00 starts). */
const FIRST_HOUR = 7;
const LAST_HOUR = 22;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));


export function verdictFor(score: number): ElectionVerdict {
  if (score >= 75) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 45) return 'mixed';
  return 'avoid';
}

/**
 * Electional astrology, computed — never asked of the model.
 *
 * A day is judged on the classic electional rules: the Moon's phase, whether
 * it is void of course, its sign and the aspects it perfects that day, the
 * retrogrades that hurt this kind of event, eclipse windows, combust
 * significators, and how the day's transits touch the person's natal chart.
 * The best hours come from casting the event chart hour by hour and checking
 * where the benefics and malefics fall.
 *
 * The sky is cast once per local midnight (light cast, ~2.5 ms) and the Moon
 * and planets are interpolated in between, so void-of-course and aspect times
 * are good to about an hour; a 12-month scan stays around a second.
 */
@Injectable()
export class ElectionScoringService {
  constructor(private readonly ephemeris: EphemerisService) {}

  context(
    birth: { birthDate: string; birthTime: string; latitude: number; longitude: number; unknownTime?: boolean },
    place: { latitude: number; longitude: number },
    profile: ElectionProfile,
    locale: Locale,
  ): ScanContext {
    const natalChart = this.ephemeris.computeChart({
      birthDate: birth.birthDate,
      birthTime: birth.unknownTime ? '12:00' : birth.birthTime,
      latitude: birth.latitude,
      longitude: birth.longitude,
    });
    const natal = {} as Record<Planet, number>;
    for (const p of PLANETS) natal[p] = this.body(natalChart, p).ChartPosition.Ecliptic.DecimalDegrees;
    return { latitude: place.latitude, longitude: place.longitude, natal, profile, locale, skies: new Map() };
  }

  // ── Day ─────────────────────────────────────────────────────────────────────

  scoreDay(ctx: ScanContext, date: string): DayDetail {
    const { profile, locale } = ctx;
    const d0 = this.midnight(ctx, date);
    const d1 = this.midnight(ctx, addDays(date, 1));
    const noonT = this.ephemeris.utcForLocal(date, 12, 0, ctx.latitude, ctx.longitude).getTime();
    const noon = this.interpolate(d0, d1, noonT);
    const factors: ElectionFactor[] = [];

    // 1. Moon phase.
    const elong = norm(noon.lon.Moon - noon.lon.Sun);
    const phase = this.phaseOf(elong);
    const phaseImpact = this.phaseImpact(phase, profile.waxing);
    factors.push({
      key: 'moon_phase',
      tone: phaseImpact > 0 ? 'good' : phaseImpact < 0 ? 'bad' : 'neutral',
      impact: phaseImpact,
      label: moonPhaseLabel(phase, profile.waxing, locale),
    });

    // 2. Void-of-course Moon.
    const events = this.moonEvents(ctx, date);
    const voc = this.vocIntervals(events).filter((v) => v.to > d0.t && v.from < d1.t);
    const dayStart = this.ephemeris.utcForLocal(date, FIRST_HOUR, 0, ctx.latitude, ctx.longitude).getTime();
    const dayEnd = this.ephemeris.utcForLocal(date, 23, 0, ctx.latitude, ctx.longitude).getTime();
    if (voc.length) {
      const daytimeHours =
        voc.reduce((sum, v) => sum + Math.max(0, Math.min(v.to, dayEnd) - Math.max(v.from, dayStart)), 0) / 3_600_000;
      if (daytimeHours >= 10) {
        factors.push({ key: 'moon_voc', tone: 'bad', impact: -16, label: vocLabel(locale, null) });
      } else {
        const v = voc[0];
        const window = {
          from: this.clock(ctx, Math.max(v.from, d0.t)),
          to: v.to >= d1.t ? '24:00' : this.clock(ctx, v.to),
        };
        const impact = daytimeHours > 0 ? -Math.round(4 + daytimeHours * 1.2) : -2;
        factors.push({ key: 'moon_voc', tone: 'bad', impact, label: vocLabel(locale, window) });
      }
    }

    // 3. Moon sign.
    const moonSign = absToSign(noon.lon.Moon).sign;
    const weak = moonSign === 'Scorpio' || moonSign === 'Capricorn';
    if (profile.moonGood.includes(moonSign)) {
      factors.push({ key: 'moon_sign', tone: 'good', impact: 7, label: moonSignLabel(moonSign, 'good', locale) });
    } else if (profile.moonBad.includes(moonSign)) {
      const impact = weak ? -9 : -5;
      factors.push({ key: 'moon_sign', tone: 'bad', impact, label: moonSignLabel(moonSign, weak ? 'weak' : 'poor', locale) });
    }

    // 4. Aspects the Moon perfects during the waking day.
    let moonAspectTotal = 0;
    const moonAspects: ElectionFactor[] = [];
    for (const e of events) {
      if (e.type !== 'aspect' || e.t < dayStart || e.t > dayEnd || !e.planet || !e.aspect) continue;
      const nature = ASPECT_NATURE[e.aspect];
      let impact = 0;
      if (BENEFICS.includes(e.planet) && (nature === 'harmonic' || e.aspect === 'Conjunction')) impact = 6;
      else if (MALEFICS.includes(e.planet) && (nature === 'challenging' || e.aspect === 'Conjunction')) impact = -6;
      else if (OUTER.includes(e.planet) && nature === 'challenging') impact = -3;
      if (!impact) continue;
      moonAspectTotal += impact;
      moonAspects.push({
        key: 'moon_aspect',
        tone: impact > 0 ? 'good' : 'bad',
        impact,
        label: moonAspectLabel(e.planet, e.aspect, this.clock(ctx, e.t), impact > 0, locale),
      });
    }
    if (moonAspects.length) {
      // Keep the sum within ±12 so one busy Moon day can't swamp everything else.
      const scale = Math.abs(moonAspectTotal) > 12 ? 12 / Math.abs(moonAspectTotal) : 1;
      for (const f of moonAspects.slice(0, 3)) factors.push({ ...f, impact: Math.round(f.impact * scale) });
    }

    // 5. Retrogrades that matter for this kind of event.
    const retro: Partial<Record<Planet, boolean>> = {};
    for (const p of ['Mercury', 'Venus', 'Mars'] as Planet[]) {
      retro[p] = noon.retro[p];
      const penalty = profile.retroPenalty[p] ?? (p === 'Mercury' ? 4 : 0);
      if (noon.retro[p] && penalty) {
        factors.push({ key: 'retrograde', tone: 'bad', impact: -penalty, label: retrogradeLabel(p, locale) });
      }
    }

    // 6. Eclipse window (a lunation near the nodes within three days).
    const eclipse = this.eclipseNear(ctx, date);
    if (eclipse) {
      factors.push({ key: 'eclipse', tone: 'bad', impact: -18, label: eclipseLabel(eclipse.kind, eclipse.date, locale) });
    }

    // 7. Combust significators.
    for (const p of profile.significators) {
      if (p === 'Sun' || p === 'Moon') continue;
      if (sep(noon.lon[p], noon.lon.Sun) < COMBUST_ORB) {
        factors.push({ key: 'combust', tone: 'bad', impact: -6, label: combustLabel(p, locale) });
      }
    }

    // 8. The day's transits to this person's chart.
    factors.push(...this.natalFactors(ctx, noon));

    const raw = BASE_SCORE + factors.reduce((s, f) => s + f.impact, 0);
    const score = Math.round(clamp(raw, 3, 98));
    factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
    return { date, score, verdict: verdictFor(score), factors, retro, eclipse, voc };
  }

  private natalFactors(ctx: ScanContext, noon: Sky): ElectionFactor[] {
    const targets = [...new Set<Planet>([...ctx.profile.natalTargets, 'Sun', 'Moon'])];
    const hits: ElectionFactor[] = [];
    for (const tp of ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as Planet[]) {
      for (const np of targets) {
        const hit = matchAspect(noon.lon[tp], ctx.natal[np]);
        if (!hit) continue;
        const tight = 1 - hit.orb / hit.maxOrb;
        const nature = ASPECT_NATURE[hit.name];
        const soft = nature === 'harmonic' || hit.name === 'Conjunction';
        const hard = nature === 'challenging' || hit.name === 'Conjunction';
        let weight = 0;
        if (BENEFICS.includes(tp) && soft) weight = 5;
        else if (MALEFICS.includes(tp) && hard) weight = -6;
        else if ((tp === 'Sun' || tp === 'Mercury') && nature === 'harmonic') weight = 3;
        else if (tp === 'Moon') weight = soft && nature !== 'challenging' ? 3 : nature === 'challenging' ? -3 : 0;
        const impact = Math.round(weight * tight);
        if (!impact) continue;
        hits.push({
          key: 'natal',
          tone: impact > 0 ? 'good' : 'bad',
          impact,
          label: natalLabel(tp, np, hit.name, impact > 0, ctx.locale),
        });
      }
    }
    hits.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
    const kept = hits.slice(0, 3);
    const total = kept.reduce((s, f) => s + f.impact, 0);
    const scale = Math.abs(total) > 16 ? 16 / Math.abs(total) : 1;
    return kept.map((f) => ({ ...f, impact: Math.round(f.impact * scale) }));
  }

  // ── Hours (the event chart) ─────────────────────────────────────────────────

  bestHours(ctx: ScanContext, date: string, voc: { from: number; to: number }[]): ElectionHourWindow[] {
    const { profile, locale } = ctx;
    const hours: { h: number; score: number; asc: string; highlights: string[] }[] = [];
    for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) {
      const at = this.ephemeris.utcForLocal(date, h, 0, ctx.latitude, ctx.longitude);
      const chart = this.ephemeris.computeChartAtUtc(at, ctx.latitude, ctx.longitude);
      const asc = chart.Ascendant.Sign.label as Sign;
      const house = (p: Planet) => this.body(chart, p).House?.id ?? 0;
      const highlights: string[] = [risingHighlight(asc, locale)];
      let score = 50;

      const midHour = at.getTime() + 30 * 60_000;
      if (voc.some((v) => midHour >= v.from && midHour <= v.to)) score -= 30;

      if (MODALITY_BY_SIGN[asc]?.toLowerCase() === profile.rising) score += 5;
      if (BENEFICS.includes(TRADITIONAL_SIGN_RULER[asc])) score += 4;

      for (const b of BENEFICS) {
        const hb = house(b);
        if (hb === 1 || hb === 10) {
          score += 10;
          highlights.push(houseHighlight(b, hb, locale));
        } else if (profile.houses.includes(hb)) {
          score += 7;
          highlights.push(houseHighlight(b, hb, locale));
        } else if ([6, 8, 12].includes(hb)) score -= 3;
      }
      for (const m of MALEFICS) {
        const hm = house(m);
        if ([1, 4, 7, 10].includes(hm)) score -= 10;
        if (profile.houses.includes(hm)) score -= 5;
      }
      const hMoon = house('Moon');
      if ([6, 8, 12].includes(hMoon)) score -= 8;
      else if ([1, 10, 11].includes(hMoon) || profile.houses.includes(hMoon)) score += 5;

      // The ruler of the event's own house should be free and unhurt.
      const cusp = chart.Houses.find((x) => x.id === profile.houses[0]);
      if (cusp) {
        const ruler = TRADITIONAL_SIGN_RULER[cusp.Sign.label as Sign];
        if (ruler) {
          const hr = house(ruler);
          if ([6, 8, 12].includes(hr)) score -= 5;
          if (this.body(chart, ruler).isRetrograde) score -= 4;
        }
      }
      hours.push({ h, score: clamp(score, 0, 100), asc, highlights: highlights.slice(0, 3) });
    }

    const best = Math.max(...hours.map((x) => x.score));
    const threshold = Math.max(55, best - 6);
    const windows: ElectionHourWindow[] = [];
    let run: typeof hours = [];
    const flush = () => {
      if (!run.length) return;
      const top = run.reduce((a, b) => (b.score > a.score ? b : a));
      windows.push({
        from: `${String(run[0].h).padStart(2, '0')}:00`,
        to: `${String(run[run.length - 1].h + 1).padStart(2, '0')}:00`,
        score: Math.round(run.reduce((s, x) => s + x.score, 0) / run.length),
        ascendant: top.asc,
        highlights: top.highlights,
      });
      run = [];
    };
    for (const x of hours) {
      if (x.score >= threshold) run.push(x);
      else flush();
    }
    flush();
    if (!windows.length) {
      // A weak day still has a least-bad hour; show it rather than nothing.
      const top = hours.reduce((a, b) => (b.score > a.score ? b : a));
      windows.push({
        from: `${String(top.h).padStart(2, '0')}:00`,
        to: `${String(top.h + 1).padStart(2, '0')}:00`,
        score: top.score,
        ascendant: top.asc,
        highlights: top.highlights,
      });
    }
    return windows.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  // ── Flows ───────────────────────────────────────────────────────────────────

  check(ctx: ScanContext, date: string, today: string) {
    const day = this.scoreDay(ctx, date);
    const hours = this.bestHours(ctx, date, day.voc);
    const alternatives: ElectionAlternative[] = [];
    const candidates: ElectionDay[] = [];
    for (let i = -14; i <= 14; i++) {
      const d = addDays(date, i);
      if (i === 0 || d < today) continue;
      candidates.push(this.scoreDay(ctx, d));
    }
    for (const c of candidates.sort((a, b) => b.score - a.score)) {
      if (c.score < day.score + 6 || alternatives.length >= 3) break;
      if (alternatives.some((a) => Math.abs(this.daysBetween(a.date, c.date)) < 2)) continue;
      alternatives.push({ date: c.date, score: c.score, verdict: c.verdict });
    }
    return { day: this.publicDay(day), hours, alternatives };
  }

  search(ctx: ScanContext, from: string, to: string) {
    const details: DayDetail[] = [];
    for (let d = from; d <= to; d = addDays(d, 1)) details.push(this.scoreDay(ctx, d));

    const top: ElectionPick[] = [];
    for (const c of [...details].sort((a, b) => b.score - a.score)) {
      if (top.length >= 5) break;
      if (top.some((t) => Math.abs(this.daysBetween(t.date, c.date)) < 3)) continue;
      const hours = this.bestHours(ctx, c.date, c.voc);
      top.push({ ...this.publicDay(c), bestHour: hours[0] ?? null });
    }

    return {
      days: details.map((d) => ({ date: d.date, score: d.score })),
      top,
      avoid: this.avoidPeriods(ctx, details),
    };
  }

  private avoidPeriods(ctx: ScanContext, details: DayDetail[]): ElectionAvoid[] {
    const avoid: ElectionAvoid[] = [];
    const retroPlanets = (['Mercury', 'Venus', 'Mars'] as Planet[]).filter(
      (p) => (ctx.profile.retroPenalty[p] ?? (p === 'Mercury' ? 4 : 0)) >= 8 || p === 'Mercury',
    );
    for (const p of retroPlanets) {
      let start = -1;
      for (let i = 0; i <= details.length; i++) {
        const inRetro = i < details.length && !!details[i].retro[p];
        if (inRetro && start < 0) start = i;
        if (!inRetro && start >= 0) {
          avoid.push({
            kind: 'retrograde',
            from: details[start].date,
            to: details[i - 1].date,
            label: retrogradeShort(p, ctx.locale),
          });
          start = -1;
        }
      }
    }
    const seen = new Set<string>();
    for (const d of details) {
      if (!d.eclipse || seen.has(d.eclipse.date)) continue;
      seen.add(d.eclipse.date);
      avoid.push({
        kind: 'eclipse',
        from: addDays(d.eclipse.date, -3),
        to: addDays(d.eclipse.date, 3),
        label: `${eclipseShort(d.eclipse.kind, ctx.locale)} · ${d.eclipse.date}`,
      });
    }
    return avoid.sort((a, b) => a.from.localeCompare(b.from));
  }

  // ── Sky sampling ────────────────────────────────────────────────────────────

  private midnight(ctx: ScanContext, date: string): Sky {
    const hit = ctx.skies.get(date);
    if (hit) return hit;
    const at = this.ephemeris.utcForLocal(date, 0, 0, ctx.latitude, ctx.longitude);
    const h = this.ephemeris.bodiesAtUtc(at, ctx.latitude, ctx.longitude);
    const lon = {} as Record<Planet, number>;
    const retro = {} as Record<Planet, boolean>;
    for (const p of PLANETS) {
      const b = this.body(h, p);
      lon[p] = b.ChartPosition.Ecliptic.DecimalDegrees;
      retro[p] = !!b.isRetrograde;
    }
    const sky: Sky = {
      t: at.getTime(),
      lon,
      retro,
      node: h.CelestialPoints.northnode.ChartPosition.Ecliptic.DecimalDegrees,
    };
    ctx.skies.set(date, sky);
    return sky;
  }

  /** Linear interpolation between two samples — fine for a day: even the Moon moves near-uniformly. */
  private interpolate(a: Sky, b: Sky, t: number): Sky {
    const f = clamp((t - a.t) / (b.t - a.t), 0, 1);
    const lon = {} as Record<Planet, number>;
    for (const p of PLANETS) lon[p] = norm(a.lon[p] + f * signed(b.lon[p] - a.lon[p]));
    return {
      t,
      lon,
      retro: f < 0.5 ? a.retro : b.retro,
      node: norm(a.node + f * signed(b.node - a.node)),
    };
  }

  /** Moon ingresses and exact Moon aspects from three days before `date` to four days after. */
  private moonEvents(ctx: ScanContext, date: string): MoonEvent[] {
    const events: MoonEvent[] = [];
    for (let i = -3; i < 4; i++) {
      const a = this.midnight(ctx, addDays(date, i));
      const b = this.midnight(ctx, addDays(date, i + 1));
      const span = b.t - a.t;
      const m0 = a.lon.Moon;
      const dm = norm(b.lon.Moon - m0); // the Moon always moves forward, ~12–15°/day

      const nextBoundary = (Math.floor(m0 / 30) + 1) * 30;
      if (m0 + dm >= nextBoundary) {
        events.push({ t: a.t + ((nextBoundary - m0) / dm) * span, type: 'ingress' });
      }
      for (const p of OTHER_PLANETS) {
        const r0 = norm(m0 - a.lon[p]);
        const dr = dm - signed(b.lon[p] - a.lon[p]);
        if (dr <= 0) continue;
        for (const [angle, name] of MOON_ASPECT_ANGLES) {
          const ahead = norm(angle - r0);
          if (ahead < dr) events.push({ t: a.t + (ahead / dr) * span, type: 'aspect', planet: p, aspect: name });
        }
      }
    }
    return events.sort((x, y) => x.t - y.t);
  }

  /** Void of course: from the Moon's last exact aspect in a sign until it enters the next sign. */
  private vocIntervals(events: MoonEvent[]): { from: number; to: number }[] {
    const out: { from: number; to: number }[] = [];
    const ingresses = events.filter((e) => e.type === 'ingress');
    for (let i = 1; i < ingresses.length; i++) {
      const prev = ingresses[i - 1].t;
      const at = ingresses[i].t;
      const lastAspect = events.filter((e) => e.type === 'aspect' && e.t > prev && e.t < at).pop();
      out.push({ from: lastAspect ? lastAspect.t : prev, to: at });
    }
    return out;
  }

  private eclipseNear(ctx: ScanContext, date: string): { kind: 'solar' | 'lunar'; date: string } | null {
    for (let i = -3; i <= 3; i++) {
      const day = addDays(date, i);
      const a = this.midnight(ctx, day);
      const b = this.midnight(ctx, addDays(day, 1));
      const e0 = norm(a.lon.Moon - a.lon.Sun);
      const e1 = norm(b.lon.Moon - b.lon.Sun);
      const newMoon = e1 < e0; // elongation wrapped past 360°
      const fullMoon = e0 < 180 && e1 >= 180;
      if (!newMoon && !fullMoon) continue;
      const target = newMoon ? 360 : 180;
      const f = (target - e0) / (newMoon ? e1 + 360 - e0 : e1 - e0);
      const at = this.interpolate(a, b, a.t + f * (b.t - a.t));
      const fromNode = Math.min(sep(at.lon.Moon, at.node), sep(at.lon.Moon, at.node + 180));
      if (fromNode <= ECLIPSE_NODE_ORB) return { kind: newMoon ? 'solar' : 'lunar', date: day };
    }
    return null;
  }

  private phaseOf(elong: number): MoonPhaseKey {
    if (elong < 12) return 'new';
    if (elong < 90) return 'waxing_crescent';
    if (elong < 168) return 'waxing_gibbous';
    if (elong < 192) return 'full';
    if (elong < 320) return 'waning';
    return 'balsamic';
  }

  private phaseImpact(phase: MoonPhaseKey, wantsWaxing: boolean): number {
    const table: Record<MoonPhaseKey, [number, number]> = {
      // [beginnings that want a waxing Moon, everything else]
      new: [1, 0],
      waxing_crescent: [9, 4],
      waxing_gibbous: [7, 3],
      full: [-3, -2],
      waning: [-7, 0],
      balsamic: [-10, -4],
    };
    return table[phase][wantsWaxing ? 0 : 1];
  }

  private publicDay(d: DayDetail): ElectionDay {
    return { date: d.date, score: d.score, verdict: d.verdict, factors: d.factors };
  }

  private clock(ctx: ScanContext, t: number): string {
    return this.ephemeris.localClock(new Date(t), ctx.latitude, ctx.longitude);
  }

  private daysBetween(a: string, b: string): number {
    return (Date.parse(b) - Date.parse(a)) / DAY_MS;
  }

  private body(h: RawHoroscope, name: string): RawPoint {
    return h.CelestialBodies[name.toLowerCase()] as RawPoint;
  }
}
