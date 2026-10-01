import { Locale } from '../astrology/interpretation.types';

/**
 * Deterministic EN/TR wording for every electional factor. The scoring is
 * pure compute, so its explanations are templates too — the AI only turns
 * these into a narrative, it never decides what the sky is doing.
 */

const PLANET: Record<Locale, Record<string, string>> = {
  en: {
    Sun: 'Sun', Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus', Mars: 'Mars',
    Jupiter: 'Jupiter', Saturn: 'Saturn', Uranus: 'Uranus', Neptune: 'Neptune', Pluto: 'Pluto',
  },
  tr: {
    Sun: 'Güneş', Moon: 'Ay', Mercury: 'Merkür', Venus: 'Venüs', Mars: 'Mars',
    Jupiter: 'Jüpiter', Saturn: 'Satürn', Uranus: 'Uranüs', Neptune: 'Neptün', Pluto: 'Plüton',
  },
};

const SIGN: Record<Locale, Record<string, string>> = {
  en: {
    Aries: 'Aries', Taurus: 'Taurus', Gemini: 'Gemini', Cancer: 'Cancer', Leo: 'Leo', Virgo: 'Virgo',
    Libra: 'Libra', Scorpio: 'Scorpio', Sagittarius: 'Sagittarius', Capricorn: 'Capricorn', Aquarius: 'Aquarius', Pisces: 'Pisces',
  },
  tr: {
    Aries: 'Koç', Taurus: 'Boğa', Gemini: 'İkizler', Cancer: 'Yengeç', Leo: 'Aslan', Virgo: 'Başak',
    Libra: 'Terazi', Scorpio: 'Akrep', Sagittarius: 'Yay', Capricorn: 'Oğlak', Aquarius: 'Kova', Pisces: 'Balık',
  },
};

const ASPECT: Record<Locale, Record<string, string>> = {
  en: { Conjunction: 'conjunct', Sextile: 'sextile', Square: 'square', Trine: 'trine', Opposition: 'opposite' },
  tr: { Conjunction: 'kavuşumu', Sextile: 'altmışlığı', Square: 'karesi', Trine: 'üçgeni', Opposition: 'karşıtlığı' },
};

const MONTH: Record<Locale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
};

export const planetName = (p: string, l: Locale) => PLANET[l][p] ?? p;
export const signName = (s: string, l: Locale) => SIGN[l][s] ?? s;

/** "2027-10-30" → "30 Oct" / "30 Eki". */
export function shortDate(iso: string, l: Locale): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH[l][m - 1]}`;
}

export type MoonPhaseKey = 'new' | 'waxing_crescent' | 'waxing_gibbous' | 'full' | 'waning' | 'balsamic';

export function moonPhaseLabel(phase: MoonPhaseKey, wantsWaxing: boolean, l: Locale): string {
  const tr: Record<MoonPhaseKey, string> = {
    new: 'Yeni Ay — tohum ekme anı, sessiz bir başlangıç',
    waxing_crescent: 'Büyüyen Ay — başlatılan şey büyüyerek ilerler',
    waxing_gibbous: 'Büyüyen Ay (dolunaya yakın) — ivme yüksek',
    full: 'Dolunay — duygular ve görünürlük doruğunda, dengesi hassas',
    waning: wantsWaxing ? 'Küçülen Ay — yeni başlangıçlardan çok bitirmeye uygun' : 'Küçülen Ay — sakin, toparlayıcı bir dönem',
    balsamic: 'Karanlık Ay (yeni aydan hemen önce) — enerji en düşük, başlangıç için zayıf',
  };
  const en: Record<MoonPhaseKey, string> = {
    new: 'New Moon — a quiet, seed-planting start',
    waxing_crescent: 'Waxing Moon — what starts now grows',
    waxing_gibbous: 'Waxing Moon near full — strong momentum',
    full: 'Full Moon — feelings and visibility peak; balance is delicate',
    waning: wantsWaxing ? 'Waning Moon — better for finishing than starting' : 'Waning Moon — a calm, settling phase',
    balsamic: 'Dark Moon (just before the new Moon) — energy is lowest, weak for beginnings',
  };
  return (l === 'tr' ? tr : en)[phase];
}

export function vocLabel(l: Locale, window: { from: string; to: string } | null): string {
  if (!window) {
    return l === 'tr'
      ? 'Ay gün boyu boşlukta — başlatılan işler sonuçsuz kalmaya yatkın'
      : 'Moon void of course all day — things started now tend to fizzle';
  }
  return l === 'tr'
    ? `Ay ${window.from}–${window.to} arası boşlukta — bu saatlerde başlatma`
    : `Moon void of course ${window.from}–${window.to} — don't start then`;
}

export function moonSignLabel(sign: string, tone: 'good' | 'weak' | 'poor', l: Locale): string {
  const s = signName(sign, l);
  if (l === 'tr') {
    if (tone === 'good') return `Ay ${s} burcunda — bu iş için destekleyici`;
    if (tone === 'weak') return `Ay ${s} burcunda (zayıf konum) — duygusal gerilim`;
    return `Ay ${s} burcunda — bu iş için huzursuz bir uyum`;
  }
  if (tone === 'good') return `Moon in ${s} — supportive for this`;
  if (tone === 'weak') return `Moon in ${s} (weak placement) — emotional strain`;
  return `Moon in ${s} — a restless fit for this`;
}

export function moonAspectLabel(planet: string, aspect: string, at: string, good: boolean, l: Locale): string {
  const p = planetName(planet, l);
  if (l === 'tr') {
    return `Ay–${p} ${ASPECT.tr[aspect] ?? aspect} (${at}) — ${good ? 'kolaylık ve destek' : 'gecikme ve sürtüşme'}`;
  }
  return `Moon ${ASPECT.en[aspect] ?? aspect} ${p} (${at}) — ${good ? 'ease and support' : 'delays and friction'}`;
}

export function retrogradeLabel(planet: string, l: Locale): string {
  const tr: Record<string, string> = {
    Mercury: 'Merkür retrosu — evrak, konuşma ve planlar yeniden gözden geçirilmeye yatkın',
    Venus: 'Venüs retrosu — aşk ve para kararları ikinci düşünceye açık',
    Mars: 'Mars retrosu — ileri atılmak dirençle karşılaşır',
  };
  const en: Record<string, string> = {
    Mercury: 'Mercury retrograde — papers, talks and plans tend to be revisited',
    Venus: 'Venus retrograde — love and money decisions invite second thoughts',
    Mars: 'Mars retrograde — pushing forward meets resistance',
  };
  return (l === 'tr' ? tr : en)[planet] ?? `${planetName(planet, l)} retrograde`;
}

export function retrogradeShort(planet: string, l: Locale): string {
  return l === 'tr' ? `${planetName(planet, l)} retrosu` : `${planetName(planet, l)} retrograde`;
}

export function eclipseLabel(kind: 'solar' | 'lunar', dateISO: string, l: Locale): string {
  const d = shortDate(dateISO, l);
  if (l === 'tr') {
    return `Tutulma penceresi (${d} ${kind === 'solar' ? 'Güneş' : 'Ay'} tutulması) — öngörülemez, büyük başlangıçlardan kaçın`;
  }
  return `Eclipse window (${kind} eclipse ${d}) — unpredictable, avoid big starts`;
}

export function eclipseShort(kind: 'solar' | 'lunar', l: Locale): string {
  if (l === 'tr') return kind === 'solar' ? 'Güneş tutulması' : 'Ay tutulması';
  return kind === 'solar' ? 'Solar eclipse' : 'Lunar eclipse';
}

export function combustLabel(planet: string, l: Locale): string {
  const p = planetName(planet, l);
  return l === 'tr'
    ? `${p} Güneş'e çok yakın (yanık) — gücü azalmış`
    : `${p} too close to the Sun (combust) — weakened`;
}

export function natalLabel(transit: string, natal: string, aspect: string, good: boolean, l: Locale): string {
  const t = planetName(transit, l);
  const n = planetName(natal, l);
  if (l === 'tr') {
    return `${t} ↔ natal ${n} ${ASPECT.tr[aspect] ?? aspect} — ${good ? 'sana kişisel destek' : 'senin için zorlayıcı'}`;
  }
  return `${t} ${ASPECT.en[aspect] ?? aspect} your natal ${n} — ${good ? 'personal support' : 'personally testing'}`;
}

export function houseHighlight(planet: string, house: number, l: Locale): string {
  const p = planetName(planet, l);
  return l === 'tr' ? `${p} ${house}. evde` : `${p} in the ${ordinal(house)} house`;
}

export function risingHighlight(sign: string, l: Locale): string {
  return l === 'tr' ? `Yükselen ${signName(sign, l)}` : `${signName(sign, l)} rising`;
}

function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}
