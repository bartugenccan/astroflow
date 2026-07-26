import {
  BestDaysResponse,
  BestDayScore,
  CreateBirthProfileDto,
  Forecast,
  ForecastPeriod,
  LifeArea,
} from "../types";
import { Locale } from "../../i18n";

/**
 * Deterministic mock best-days + forecast, seeded from the birth data so the
 * same chart always yields the same scores (mirrors the backend's determinism).
 */

const AREAS: LifeArea[] = ["love", "career", "money", "energy"];

function seed(dto: CreateBirthProfileDto): number {
  const s = `${dto.birthDate}|${dto.birthTime}|${dto.latitude}|${dto.longitude}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Cheap deterministic pseudo-random in [0,1) from an integer.
function rnd(n: number): number {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

function startParts(start?: string): { y: number; m: number; d: number } {
  if (start) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start);
    if (m) return { y: +m[1], m: +m[2], d: +m[3] };
  }
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

const REASONS: Record<Locale, Record<LifeArea, string[]>> = {
  en: {
    love: ["Venus warms your connections", "an easy day for the heart", "tenderness flows"],
    career: ["momentum favours your work", "a focused, productive day", "ambition is supported"],
    money: ["favourable for value & gains", "a good day to review finances", "resources align"],
    energy: ["vitality runs high", "strong physical charge", "your drive is clear"],
  },
  tr: {
    love: ["Venüs bağlarını ısıtıyor", "kalp için kolay bir gün", "şefkat akıyor"],
    career: ["ivme işini destekliyor", "odaklı, verimli bir gün", "hedefler destekleniyor"],
    money: ["değer ve kazanç için uygun", "finansı gözden geçirmek için iyi", "kaynaklar hizalanıyor"],
    energy: ["canlılık yüksek", "güçlü fiziksel enerji", "azmin net"],
  },
};

export function mockBestDays(
  dto: CreateBirthProfileDto,
  days: number,
  locale: Locale,
  start?: string,
): BestDaysResponse {
  const base = seed(dto);
  const sp = startParts(start);
  const scores: BestDayScore[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(Date.UTC(sp.y, sp.m - 1, sp.d + i, 12));
    const date = d.toISOString().slice(0, 10);
    const score = (area: number) =>
      Math.round(30 + rnd(base + i * 7 + area * 101) * 60);
    const love = score(1);
    const career = score(2);
    const money = score(3);
    const energy = score(4);
    scores.push({
      date,
      love,
      career,
      money,
      energy,
      overall: Math.round((love + career + money + energy) / 4),
    });
  }

  const top = {} as BestDaysResponse["top"];
  AREAS.forEach((area, ai) => {
    top[area] = [...scores]
      .sort((a, b) => b[area] - a[area])
      .slice(0, 5)
      .map((s, idx) => ({
        date: s.date,
        score: s[area],
        reason: REASONS[locale][area][idx % REASONS[locale][area].length],
      }));
  });

  return {
    start: `${sp.y}-${String(sp.m).padStart(2, "0")}-${String(sp.d).padStart(2, "0")}`,
    days,
    scores,
    top,
  };
}

export function mockForecast(
  dto: CreateBirthProfileDto,
  period: ForecastPeriod,
  locale: Locale,
  start?: string,
): Forecast {
  const sp = startParts(start);
  const startStr = `${sp.y}-${String(sp.m).padStart(2, "0")}-${String(sp.d).padStart(2, "0")}`;
  const p = period === "weekly" ? (locale === "tr" ? "hafta" : "week") : locale === "tr" ? "ay" : "month";

  const themes: Forecast["themes"] =
    locale === "tr"
      ? [
          { area: "love", text: "İlişkilerde açık iletişime alan aç; küçük jestler büyük fark yaratır." },
          { area: "career", text: "Tek bir önceliğe odaklan; istikrarlı adımlar ilerleme getirir." },
          { area: "money", text: "Bütçeni gözden geçir; değer odaklı seçimler yap." },
          { area: "energy", text: "Dinlenme ile hareketi dengele; temponu koru." },
        ]
      : [
          { area: "love", text: "Make room for open communication; small gestures go a long way." },
          { area: "career", text: "Focus on one priority; steady steps bring real progress." },
          { area: "money", text: "Review your budget; favour value-led choices over impulse." },
          { area: "energy", text: "Balance rest with movement; keep a sustainable pace." },
        ];

  return {
    period,
    start: startStr,
    overview:
      locale === "tr"
        ? `Bu ${p} genel olarak dengeli bir enerji taşıyor. Küçük ve kararlı adımlarla ilerle; fırsatlar sabırlı olanı ödüllendirir.`
        : `This ${p} carries a broadly balanced energy. Move in small, deliberate steps; the openings reward patience.`,
    themes,
    keyDates: [],
  };
}
