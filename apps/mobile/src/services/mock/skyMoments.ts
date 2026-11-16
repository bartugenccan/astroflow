import type { CreateBirthProfileDto, SkyMoment, SkyMomentsResponse } from "../types";

/**
 * Offline stand-in for GET /plan/moments. The real moments come from the
 * server's ephemeris (astronomy-engine); the device has no ephemeris, so the
 * mock is a fixed, plausible set dated around "now". It is deterministic so
 * screens and screenshots stay stable, and it covers every card state
 * (active, upcoming, a soft note, a "possible" Moon contact).
 */
const DAY = 86_400_000;

export function mockSkyMoments(dto: CreateBirthProfileDto, now: Date): SkyMomentsResponse {
  const t = now.getTime();
  const iso = (offsetDays: number) => new Date(t + offsetDays * DAY).toISOString();
  const age = Math.max(0, Math.floor((t - Date.parse(`${dto.birthDate}T12:00:00Z`)) / (365.2425 * DAY)));

  const moments: SkyMoment[] = [
    {
      id: "mock:outer_transit:Saturn:Sun:square",
      kind: "outer_transit",
      planet: "Saturn",
      target: "Sun",
      aspect: "square",
      start: iso(-60),
      peak: iso(20),
      end: iso(150),
      passes: [iso(20), iso(95), iso(130)],
      orb: 0.6,
      salience: 88,
      personal: true,
      needsBirthTime: false,
      certainty: "exact",
      openEnded: false,
      status: "active",
      detail: { age },
    },
    {
      id: "mock:station_on_natal:Mercury:Venus",
      kind: "station_on_natal",
      planet: "Mercury",
      target: "Venus",
      aspect: "conjunction",
      start: iso(9),
      peak: iso(12),
      end: iso(15),
      passes: [iso(12)],
      orb: 0.4,
      salience: 55,
      personal: true,
      needsBirthTime: false,
      certainty: "exact",
      openEnded: false,
      status: "upcoming",
      detail: { stationKind: "retrograde", sign: "Scorpio", degree: 20.98 },
    },
    {
      id: "mock:lunation_on_natal:Moon:Moon",
      kind: "lunation_on_natal",
      planet: "Moon",
      target: "Moon",
      aspect: "conjunction",
      start: iso(5),
      peak: iso(8),
      end: iso(11),
      passes: [iso(8)],
      orb: 1.8,
      salience: 27,
      personal: true,
      needsBirthTime: false,
      certainty: "possible",
      openEnded: false,
      status: "upcoming",
      detail: { lunationKind: "new", sign: "Cancer", degree: 11.96 },
    },
    {
      id: "mock:retrograde_period:Mercury",
      kind: "retrograde_period",
      planet: "Mercury",
      target: null,
      aspect: null,
      start: iso(12),
      peak: iso(12),
      end: iso(33),
      passes: [iso(12), iso(33)],
      orb: 0,
      salience: 15,
      personal: false,
      needsBirthTime: false,
      certainty: "exact",
      openEnded: false,
      status: "upcoming",
      detail: { sign: "Scorpio", degree: 20.98 },
    },
    {
      id: "mock:double_retrograde:Saturn",
      kind: "double_retrograde",
      planet: "Saturn",
      target: "Saturn",
      aspect: null,
      start: iso(-110),
      peak: iso(-110),
      end: iso(24),
      passes: [iso(-110), iso(24)],
      orb: 0,
      salience: 15,
      personal: true,
      needsBirthTime: false,
      certainty: "exact",
      openEnded: false,
      status: "active",
      detail: { sign: "Aries", degree: 14.75 },
    },
  ];

  const day = (d: number) => iso(d).slice(0, 10);
  return { from: day(-30), to: day(365), unknownTime: false, moments };
}
