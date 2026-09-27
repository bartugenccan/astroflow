import {
  CreateBirthProfileDto,
  ForecastTheme,
  LifeArea,
  YearAhead,
  YearAheadChart,
} from "../types";
import { Locale } from "../../i18n";

/**
 * Deterministic mock "Your Year Ahead", seeded from the birth data so the same
 * chart always produces the same year (mirrors the backend's determinism).
 *
 * The real solar-return solve lives on the API; this stands in when the app
 * runs without `EXPO_PUBLIC_API_URL`. It keeps the *shape* honest — including
 * a plausible return chart behind "show me why" — so the UI can be built and
 * reviewed offline.
 */

const AREAS: LifeArea[] = ["love", "career", "money", "energy"];

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const PLANETS = [
  { name: "Sun", symbol: "☉" },
  { name: "Moon", symbol: "☽" },
  { name: "Mercury", symbol: "☿" },
  { name: "Venus", symbol: "♀" },
  { name: "Mars", symbol: "♂" },
  { name: "Jupiter", symbol: "♃" },
  { name: "Saturn", symbol: "♄" },
  { name: "Uranus", symbol: "♅" },
  { name: "Neptune", symbol: "♆" },
  { name: "Pluto", symbol: "♇" },
];

function seed(dto: CreateBirthProfileDto): number {
  const s = `${dto.birthDate}|${dto.birthTime}|${dto.latitude}|${dto.longitude}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function rnd(n: number): number {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

const HEADLINES: Record<Locale, string[]> = {
  en: [
    "A year about building something that lasts.",
    "A year that rewards choosing one direction.",
    "A year for tending what you already have.",
    "A year that asks you to be seen more clearly.",
  ],
  tr: [
    "Sağlam bir şey kurmakla ilgili bir yıl.",
    "Tek bir yön seçmenin karşılığını veren bir yıl.",
    "Elindekine özen göstermenin yılı.",
    "Daha net görünmeni isteyen bir yıl.",
  ],
};

const STRENGTH_TEXT: Record<Locale, Record<LifeArea, string>> = {
  en: {
    love: "The people close to you meet you halfway this year — let them.",
    career: "Steady, visible effort counts for more than one big push.",
    money: "Your instincts about what is worth paying for are sound right now.",
    energy: "You have more stamina than last year; spend it deliberately.",
  },
  tr: {
    love: "Bu yıl yakınındakiler sana yarı yolda geliyor — bırak gelsinler.",
    career: "İstikrarlı ve görünür emek, tek büyük hamleden daha çok işe yarıyor.",
    money: "Neye para vermeye değeceğine dair sezgin şu sıra isabetli.",
    energy: "Geçen yıla göre daha dayanıklısın; bunu bilerek harca.",
  },
};

const TENDER_TEXT: Record<Locale, Record<LifeArea, string>> = {
  en: {
    love: "Say the awkward thing early — this year punishes the unsaid.",
    career: "Guard your attention; being busy will masquerade as progress.",
    money: "Slow down on the big commitments until the middle of the year.",
    energy: "Rest is the thing you will be tempted to cut first. Don't.",
  },
  tr: {
    love: "Zor cümleyi erken kur — bu yıl söylenmeyeni affetmiyor.",
    career: "Dikkatini koru; yoğunluk kendini ilerleme gibi gösterecek.",
    money: "Büyük taahhütlerde yılın ortasına kadar yavaş git.",
    energy: "İlk kısmak isteyeceğin şey dinlenmek olacak. Kısma.",
  },
};

const TURNING_LABELS: Record<Locale, string[]> = {
  en: [
    "a door opens at work",
    "a relationship finds its footing",
    "worth revisiting a decision you parked",
    "a quieter stretch — use it to reset",
  ],
  tr: [
    "işte bir kapı aralanıyor",
    "bir ilişki yerini buluyor",
    "kenara koyduğun bir kararı tekrar ele almaya değer",
    "daha sakin bir dönem — sıfırlamak için kullan",
  ],
};

/** Anniversary of the birth date in the cycle that covers `today`. */
function cycleWindow(dto: CreateBirthProfileDto): {
  start: string;
  end: string;
  age: number;
} {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dto.birthDate);
  const now = new Date();
  if (!m) {
    const y = now.getFullYear();
    return { start: `${y}-01-01`, end: `${y + 1}-01-01`, age: 0 };
  }
  const [, by, bm, bd] = m;
  const thisYear = new Date(Date.UTC(now.getUTCFullYear(), +bm - 1, +bd));
  // Before this year's birthday the governing cycle is last year's.
  const startYear =
    thisYear.getTime() > now.getTime()
      ? now.getUTCFullYear() - 1
      : now.getUTCFullYear();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${startYear}-${pad(+bm)}-${pad(+bd)}`,
    end: `${startYear + 1}-${pad(+bm)}-${pad(+bd)}`,
    age: startYear - +by,
  };
}

function mockChart(
  dto: CreateBirthProfileDto,
  win: { start: string; end: string; age: number },
  s: number,
): YearAheadChart {
  const planets = PLANETS.map((p, i) => {
    const r = rnd(s + i * 7.3);
    return {
      name: p.name,
      sign: SIGNS[Math.floor(r * 12)],
      degree: Math.floor(rnd(s + i * 3.1) * 30),
      minute: Math.floor(rnd(s + i * 5.7) * 60),
      house: 1 + Math.floor(rnd(s + i * 11.9) * 12),
      retrograde: rnd(s + i * 13.7) > 0.78,
      symbol: p.symbol,
    };
  });

  const byHouse = new Map<number, string[]>();
  for (const p of planets) {
    byHouse.set(p.house, [...(byHouse.get(p.house) ?? []), p.name]);
  }

  const sun = planets[0];
  const moon = planets[1];

  return {
    returnAtUtc: `${win.start}T09:00:00.000Z`,
    returnDateLocal: win.start,
    ageTurning: win.age,
    windowStart: win.start,
    windowEnd: win.end,
    ascendantSign: SIGNS[Math.floor(rnd(s + 101) * 12)],
    midheavenSign: SIGNS[Math.floor(rnd(s + 202) * 12)],
    sunHouse: sun.house,
    moonSign: moon.sign,
    moonHouse: moon.house,
    planets,
    angularPlanets: planets
      .filter((p) => [1, 4, 7, 10].includes(p.house))
      .map((p) => p.name),
    houseEmphasis: [...byHouse.entries()]
      .filter(([, list]) => list.length >= 2)
      .map(([house, list]) => ({ house, planets: list }))
      .sort((a, b) => b.planets.length - a.planets.length),
    aspectsToSun: planets.slice(1, 4).map((p, i) => ({
      planet: p.name,
      aspect: ["Trine", "Square", "Sextile"][i],
      orb: Math.round(rnd(s + i * 17.3) * 60) / 10,
      type: (["harmonic", "challenging", "harmonic"] as const)[i],
    })),
  };
}

export function mockYearAhead(
  dto: CreateBirthProfileDto,
  locale: Locale,
): YearAhead {
  const s = seed(dto);
  const win = cycleWindow(dto);
  const chart = mockChart(dto, win, s);

  // Rotate the area ranking off the seed so different charts differ.
  const offset = Math.floor(rnd(s + 41) * 4);
  const focusAreas = AREAS.map((_, i) => AREAS[(i + offset) % 4]);

  const strengths: ForecastTheme[] = focusAreas
    .slice(0, 2)
    .map((area) => ({ area, text: STRENGTH_TEXT[locale][area] }));
  const tender: ForecastTheme[] = focusAreas
    .slice(3)
    .map((area) => ({ area, text: TENDER_TEXT[locale][area] }));

  // Four months spread across the window, seeded but always in order.
  const startM = new Date(`${win.start}T00:00:00Z`);
  const turningPoints = [2, 5, 8, 10].map((offsetMonths, i) => {
    const d = new Date(startM);
    d.setUTCMonth(d.getUTCMonth() + offsetMonths);
    return {
      month: d.toISOString().slice(0, 7),
      label: TURNING_LABELS[locale][(i + offset) % TURNING_LABELS[locale].length],
    };
  });

  return {
    start: win.start,
    end: win.end,
    age: win.age,
    headline: HEADLINES[locale][Math.floor(rnd(s + 61) * HEADLINES[locale].length)],
    overview:
      locale === "tr"
        ? `${win.age} yaşına girdiğin bu yıl acele etmeni değil, yön seçmeni istiyor. Küçük ve tutarlı adımlar, büyük ama dağınık hamlelerden daha uzağa götürüyor.`
        : `The year you turn ${win.age} asks you to choose a direction rather than hurry. Small, consistent steps will carry you further than big scattered ones.`,
    strengths,
    tender,
    turningPoints,
    why:
      locale === "tr"
        ? "Bu okuma, doğum gününde gökyüzünün aldığı yeni düzene dayanıyor. Yılın ağırlığının nereye düştüğüne ve hangi aylarda belirginleştiğine bakıyoruz."
        : "This reading rests on the fresh arrangement the sky takes on around your birthday — where the weight of the year falls, and which months it becomes most noticeable in.",
    focusAreas,
    chart,
  };
}
