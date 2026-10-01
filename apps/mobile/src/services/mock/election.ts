import {
  ElectionCheck,
  ElectionCheckQuery,
  ElectionCheckReading,
  ElectionDay,
  ElectionEventId,
  ElectionFactor,
  ElectionHourWindow,
  ElectionSearch,
  ElectionSearchQuery,
  ElectionSearchReading,
  ElectionVerdict,
} from "../types";
import { Locale, TranslationKey, translate } from "../../i18n";
import { addDaysISO, formatDayMonthYear, todayISO } from "../../lib/dates";

/**
 * Offline stand-ins for the election endpoints. They do NOT compute the sky —
 * scores come from a stable hash of the date so screens can be exercised
 * without the API. The real scoring lives in apps/api (ElectionScoringService).
 */

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
};

const verdictFor = (score: number): ElectionVerdict =>
  score >= 75 ? "excellent" : score >= 60 ? "good" : score >= 45 ? "mixed" : "avoid";

const eventOf = (id: ElectionEventId | undefined): ElectionEventId => id ?? "new_beginning";

function mockDay(date: string, locale: Locale): ElectionDay {
  const score = 30 + (hash(date) % 66);
  const tr = locale === "tr";
  const factors: ElectionFactor[] = [
    {
      key: "moon_phase",
      tone: score > 55 ? "good" : "bad",
      impact: score > 55 ? 9 : -7,
      label: score > 55
        ? tr ? "Büyüyen Ay — başlatılan şey büyüyerek ilerler" : "Waxing Moon — what starts now grows"
        : tr ? "Küçülen Ay — yeni başlangıçlardan çok bitirmeye uygun" : "Waning Moon — better for finishing than starting",
    },
    {
      key: "moon_sign",
      tone: "good",
      impact: 7,
      label: tr ? "Ay Boğa burcunda — bu iş için destekleyici" : "Moon in Taurus — supportive for this",
    },
  ];
  if (score < 50) {
    factors.push({
      key: "retrograde",
      tone: "bad",
      impact: -12,
      label: tr ? "Merkür retrosu — evrak ve planlar yeniden gözden geçirilmeye yatkın" : "Mercury retrograde — papers and plans tend to be revisited",
    });
  }
  return { date, score, verdict: verdictFor(score), factors };
}

const mockHours = (): ElectionHourWindow[] => [
  { from: "10:00", to: "12:00", score: 72, ascendant: "Leo", highlights: ["Leo rising", "Venus in the 10th house"] },
  { from: "17:00", to: "18:00", score: 64, ascendant: "Capricorn", highlights: ["Capricorn rising"] },
];

export function mockElectionCheck(q: ElectionCheckQuery, locale: Locale): ElectionCheck {
  const id = eventOf(q.eventId);
  const day = mockDay(q.date, locale);
  const alternatives = [-3, 2, 6]
    .map((n) => addDaysISO(q.date, n))
    .filter((d) => d >= todayISO())
    .map((d) => mockDay(d, locale))
    .filter((d) => d.score > day.score + 5)
    .map(({ date, score, verdict }) => ({ date, score, verdict }));
  return {
    ...day,
    event: { id, label: translate(locale, `election.events.${id}` as TranslationKey), fromText: q.eventText },
    place: q.place,
    hours: mockHours(),
    alternatives,
  };
}

export function mockElectionSearch(q: ElectionSearchQuery, locale: Locale): ElectionSearch {
  const id = eventOf(q.eventId);
  const today = todayISO();
  const first = `${q.from}-01` < today ? today : `${q.from}-01`;
  const [ty, tm] = q.to.split("-").map(Number);
  const last = new Date(Date.UTC(ty, tm, 0)).toISOString().slice(0, 10);
  const days: ElectionDay[] = [];
  for (let d = first; d <= last; d = addDaysISO(d, 1)) days.push(mockDay(d, locale));
  const top = [...days]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((d) => ({ ...d, bestHour: mockHours()[0] }));
  return {
    event: { id, label: translate(locale, `election.events.${id}` as TranslationKey), fromText: q.eventText },
    place: q.place,
    from: first,
    to: last,
    days: days.map((d) => ({ date: d.date, score: d.score })),
    top,
    avoid: [],
  };
}

export function mockElectionCheckReading(q: ElectionCheckQuery, locale: Locale): ElectionCheckReading {
  const d = formatDayMonthYear(locale, q.date);
  return locale === "tr"
    ? {
        summary: `${d} için çevrimdışı örnek yorum. Gerçek değerlendirme sunucudan gelir.`,
        why: "Bu metin, API bağlı olmadığında ekranı göstermek için kullanılan örnek bir yorumdur.",
        advice: "Önerilen saat aralıklarından birini seç.",
        caution: "Gerçek sonuç için uygulamayı sunucuya bağla.",
      }
    : {
        summary: `An offline sample reading for ${d}. The real assessment comes from the server.`,
        why: "This text is a sample shown when the API isn't connected.",
        advice: "Pick one of the suggested hour windows.",
        caution: "Connect the app to the server for a real result.",
      };
}

export function mockElectionSearchReading(_q: ElectionSearchQuery, locale: Locale): ElectionSearchReading {
  return locale === "tr"
    ? {
        summary: "Çevrimdışı örnek özet — gerçek tarih seçimi sunucuda hesaplanır.",
        tips: ["Tarihi seçtikten sonra saatini de ayarla.", "Retro dönemlerinden kaçın.", "Bir tarihe dokunup ayrıntısına bak."],
      }
    : {
        summary: "An offline sample summary — real date picking is computed on the server.",
        tips: ["Once you pick a date, set the hour too.", "Steer clear of retrograde periods.", "Tap a date to see its details."],
      };
}
