import { Locale } from './interpretation.types';
import { AspectType, LifeArea } from './astrology.constants';
import { BestDayTop } from './astrology-adapter.service';

/**
 * Deterministic, localized one-line reasons for a best/worst day — built from
 * the day's tightest driving aspect. No AI (best-days is pure compute), so the
 * endpoint stays fast, cacheable, and works offline.
 */

const PLANET_LABEL: Record<Locale, Record<string, string>> = {
  en: {
    Sun: 'Sun', Moon: 'Moon', Mercury: 'Mercury', Venus: 'Venus', Mars: 'Mars',
    Jupiter: 'Jupiter', Saturn: 'Saturn', Uranus: 'Uranus', Neptune: 'Neptune', Pluto: 'Pluto',
  },
  tr: {
    Sun: 'Güneş', Moon: 'Ay', Mercury: 'Merkür', Venus: 'Venüs', Mars: 'Mars',
    Jupiter: 'Jüpiter', Saturn: 'Satürn', Uranus: 'Uranüs', Neptune: 'Neptün', Pluto: 'Plüton',
  },
};

const ASPECT_LABEL: Record<Locale, Record<string, string>> = {
  en: {
    Conjunction: 'meets', Sextile: 'sextile', Square: 'square', Trine: 'trine', Opposition: 'opposite',
  },
  tr: {
    Conjunction: 'kavuşumu', Sextile: 'altmışlığı', Square: 'karesi', Trine: 'üçgeni', Opposition: 'karşıtı',
  },
};

const TONE: Record<Locale, Record<LifeArea, Record<AspectType, string>>> = {
  en: {
    love: { harmonic: 'warmth flows easily', challenging: 'handle feelings with care', neutral: 'a charged day for connection' },
    career: { harmonic: 'good momentum for work', challenging: 'push gently, avoid friction', neutral: 'a focused day for ambition' },
    money: { harmonic: 'favourable for value & gains', challenging: 'hold off on big spending', neutral: 'review resources today' },
    energy: { harmonic: 'vitality runs high', challenging: 'pace yourself, rest matters', neutral: 'strong physical charge' },
  },
  tr: {
    love: { harmonic: 'sıcaklık kolayca akıyor', challenging: 'duyguları özenle ele al', neutral: 'bağlantı için yoğun bir gün' },
    career: { harmonic: 'iş için iyi bir ivme', challenging: 'nazikçe ilerle, sürtüşmeden kaçın', neutral: 'hedefler için odaklı bir gün' },
    money: { harmonic: 'değer ve kazanç için uygun', challenging: 'büyük harcamayı ertele', neutral: 'kaynakları gözden geçir' },
    energy: { harmonic: 'canlılık yüksek', challenging: 'temponu ayarla, dinlen', neutral: 'güçlü fiziksel enerji' },
  },
};

export function bestDayReason(locale: Locale, top: BestDayTop, area: LifeArea): string {
  const tp = PLANET_LABEL[locale][top.transitPlanet] ?? top.transitPlanet;
  const np = PLANET_LABEL[locale][top.natalPlanet] ?? top.natalPlanet;
  const asp = ASPECT_LABEL[locale][top.aspect] ?? top.aspect;
  const tone = TONE[locale][area][top.nature];

  if (locale === 'tr') {
    return `${tp}–${np} ${asp} — ${tone}`;
  }
  return `${tp} ${asp} your ${np} — ${tone}`;
}
