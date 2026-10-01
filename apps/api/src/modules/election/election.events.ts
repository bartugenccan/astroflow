import { Planet, Sign } from '../astrology/astrology.constants';
import { Locale } from '../astrology/interpretation.types';
import { ElectionEventId, ElectionGroup } from './election.types';

/**
 * Electional profiles: which planets rule each kind of event, which houses of
 * the event chart should be strong, which retrogrades hurt it and which Moon
 * signs suit it. Drawn from the traditional electional rules (Moon waxing and
 * well placed, significators unafflicted, benefics angular) — the numbers are
 * score weights, not astrology the model invents.
 */
export interface ElectionProfile {
  id: ElectionEventId;
  group: ElectionGroup;
  name: Record<Locale, string>;
  /** Planets that signify the matter; their condition on the day counts. */
  significators: Planet[];
  /** Natal points the day's transits should favour for this person. */
  natalTargets: Planet[];
  /** Houses of the event chart that should hold benefics. */
  houses: number[];
  /** Penalty (points) when these planets are retrograde. */
  retroPenalty: Partial<Record<Planet, number>>;
  /** Beginnings want a growing Moon. */
  waxing: boolean;
  /** Fixed rising signs for things meant to last; cardinal for quick starts. */
  rising: 'fixed' | 'cardinal' | 'mutable';
  moonGood: Sign[];
  moonBad: Sign[];
  /** Words for matching free text when the AI is unavailable. */
  keywords: string[];
}

// The Moon is in fall in Scorpio and detriment in Capricorn — bad for every election.
const MOON_WEAK: Sign[] = ['Scorpio', 'Capricorn'];

export const ELECTION_PROFILES: Record<ElectionEventId, ElectionProfile> = {
  engagement: {
    id: 'engagement',
    group: 'love',
    name: { en: 'Engagement', tr: 'Nişan' },
    significators: ['Venus', 'Moon', 'Jupiter'],
    natalTargets: ['Venus', 'Moon', 'Sun'],
    houses: [7, 5, 1],
    retroPenalty: { Venus: 18, Mercury: 8 },
    waxing: true,
    rising: 'fixed',
    moonGood: ['Taurus', 'Cancer', 'Libra', 'Leo', 'Pisces'],
    moonBad: [...MOON_WEAK, 'Aries'],
    keywords: ['engage', 'nişan', 'nisan', 'söz kes', 'soz kes', 'yüzük', 'yuzuk'],
  },
  wedding: {
    id: 'wedding',
    group: 'love',
    name: { en: 'Wedding', tr: 'Düğün / nikah' },
    significators: ['Venus', 'Jupiter', 'Moon'],
    natalTargets: ['Venus', 'Moon', 'Sun'],
    houses: [7, 1, 4],
    retroPenalty: { Venus: 22, Mercury: 10 },
    waxing: true,
    rising: 'fixed',
    moonGood: ['Taurus', 'Cancer', 'Libra', 'Leo'],
    moonBad: [...MOON_WEAK, 'Aries'],
    keywords: ['wedding', 'marry', 'marriage', 'düğün', 'dugun', 'nikah', 'evlen'],
  },
  proposal: {
    id: 'proposal',
    group: 'love',
    name: { en: 'Marriage proposal', tr: 'Evlilik teklifi' },
    significators: ['Venus', 'Moon'],
    natalTargets: ['Venus', 'Moon'],
    houses: [7, 5],
    retroPenalty: { Venus: 16, Mercury: 8 },
    waxing: true,
    rising: 'cardinal',
    moonGood: ['Taurus', 'Cancer', 'Libra', 'Leo', 'Pisces'],
    moonBad: MOON_WEAK,
    keywords: ['propos', 'teklif', 'evlenme teklifi'],
  },
  first_date: {
    id: 'first_date',
    group: 'love',
    name: { en: 'First date', tr: 'İlk buluşma' },
    significators: ['Venus', 'Moon', 'Mars'],
    natalTargets: ['Venus', 'Mars', 'Moon'],
    houses: [5, 7],
    retroPenalty: { Venus: 12, Mercury: 4 },
    waxing: true,
    rising: 'cardinal',
    moonGood: ['Leo', 'Libra', 'Taurus', 'Gemini', 'Sagittarius'],
    moonBad: MOON_WEAK,
    keywords: ['date', 'buluşma', 'bulusma', 'randevu', 'flört', 'flort'],
  },
  business_launch: {
    id: 'business_launch',
    group: 'business',
    name: { en: 'Business launch', tr: 'İş kurma / lansman' },
    significators: ['Sun', 'Jupiter', 'Mercury'],
    natalTargets: ['Sun', 'Jupiter', 'Mercury'],
    houses: [10, 2, 1],
    retroPenalty: { Mercury: 18, Mars: 10 },
    waxing: true,
    rising: 'fixed',
    moonGood: ['Taurus', 'Cancer', 'Leo', 'Virgo', 'Sagittarius'],
    moonBad: MOON_WEAK,
    keywords: ['launch', 'business', 'company', 'shop', 'store', 'şirket', 'sirket', 'dükkan', 'dukkan', 'iş kur', 'is kur', 'lansman', 'açılış', 'acilis', 'mağaza', 'magaza'],
  },
  contract: {
    id: 'contract',
    group: 'business',
    name: { en: 'Signing a contract', tr: 'Sözleşme imzalama' },
    significators: ['Mercury', 'Jupiter'],
    natalTargets: ['Mercury', 'Sun'],
    houses: [7, 3, 10],
    retroPenalty: { Mercury: 24 },
    waxing: true,
    rising: 'fixed',
    moonGood: ['Taurus', 'Virgo', 'Libra', 'Gemini', 'Cancer'],
    moonBad: MOON_WEAK,
    keywords: ['contract', 'sign', 'deal', 'sözleşme', 'sozlesme', 'imza', 'anlaşma', 'anlasma', 'tapu'],
  },
  job_interview: {
    id: 'job_interview',
    group: 'business',
    name: { en: 'Job interview', tr: 'İş görüşmesi' },
    significators: ['Sun', 'Mercury', 'Jupiter'],
    natalTargets: ['Sun', 'Mercury', 'Jupiter'],
    houses: [10, 6, 1],
    retroPenalty: { Mercury: 12 },
    waxing: true,
    rising: 'cardinal',
    moonGood: ['Taurus', 'Leo', 'Virgo', 'Libra', 'Sagittarius'],
    moonBad: MOON_WEAK,
    keywords: ['interview', 'job', 'mülakat', 'mulakat', 'iş görüşme', 'is gorusme', 'terfi', 'promotion'],
  },
  investment: {
    id: 'investment',
    group: 'business',
    name: { en: 'Investment / big purchase', tr: 'Yatırım / büyük alım' },
    significators: ['Venus', 'Jupiter'],
    natalTargets: ['Venus', 'Jupiter', 'Moon'],
    houses: [2, 8, 10],
    retroPenalty: { Mercury: 14, Venus: 14 },
    waxing: true,
    rising: 'fixed',
    moonGood: ['Taurus', 'Cancer', 'Virgo', 'Sagittarius', 'Pisces'],
    moonBad: [...MOON_WEAK, 'Aries'],
    keywords: ['invest', 'buy', 'purchase', 'car', 'yatırım', 'yatirim', 'satın', 'satin', 'araba', 'araç', 'arac', 'hisse', 'altın', 'altin'],
  },
  moving: {
    id: 'moving',
    group: 'life',
    name: { en: 'Moving / new home', tr: 'Taşınma / ev alma' },
    significators: ['Moon', 'Venus'],
    natalTargets: ['Moon', 'Venus'],
    houses: [4, 1],
    retroPenalty: { Mercury: 12 },
    waxing: true,
    rising: 'fixed',
    moonGood: ['Taurus', 'Cancer', 'Leo', 'Virgo'],
    moonBad: [...MOON_WEAK, 'Aries'],
    keywords: ['move', 'moving', 'house', 'home', 'flat', 'taşın', 'tasin', 'ev al', 'ev ', 'daire', 'yeni ev'],
  },
  travel: {
    id: 'travel',
    group: 'life',
    name: { en: 'Travel', tr: 'Seyahat' },
    significators: ['Mercury', 'Jupiter', 'Moon'],
    natalTargets: ['Mercury', 'Jupiter'],
    houses: [9, 3],
    retroPenalty: { Mercury: 18 },
    waxing: false,
    rising: 'mutable',
    moonGood: ['Gemini', 'Sagittarius', 'Aquarius', 'Libra', 'Cancer'],
    moonBad: MOON_WEAK,
    keywords: ['travel', 'trip', 'flight', 'journey', 'seyahat', 'yolculuk', 'tatil', 'uçuş', 'ucus', 'gezi'],
  },
  new_beginning: {
    id: 'new_beginning',
    group: 'life',
    name: { en: 'A new beginning', tr: 'Yeni bir başlangıç' },
    significators: ['Sun', 'Moon', 'Mars'],
    natalTargets: ['Sun', 'Moon', 'Mars'],
    houses: [1, 10],
    retroPenalty: { Mars: 12, Mercury: 8 },
    waxing: true,
    rising: 'cardinal',
    moonGood: ['Aries', 'Taurus', 'Cancer', 'Leo', 'Sagittarius'],
    moonBad: MOON_WEAK,
    keywords: ['start', 'begin', 'habit', 'diet', 'course', 'başla', 'basla', 'alışkanlık', 'aliskanlik', 'kurs', 'diyet', 'spor'],
  },
};

const ELECTION_EVENT_ORDER = Object.keys(ELECTION_PROFILES) as ElectionEventId[];

/** Best-effort keyword match for free-text events (the AI classifier's fallback). */
export function matchEventByKeywords(text: string): ElectionEventId | null {
  const t = ` ${text.toLocaleLowerCase('tr-TR')} `;
  // "Evlenme teklifi" must read as a proposal before "evlen" reads as a wedding.
  const order: ElectionEventId[] = ['proposal', ...ELECTION_EVENT_ORDER.filter((id) => id !== 'proposal')];
  for (const id of order) {
    if (ELECTION_PROFILES[id].keywords.some((k) => t.includes(k))) return id;
  }
  return null;
}
