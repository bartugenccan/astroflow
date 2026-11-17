/**
 * The API's astrology vocabulary is English-canonical (`sign: "Scorpio"`), and
 * prompt templates splice those values straight into Turkish sentences
 * ("Güneş Scorpio, Ay Sagittarius"). The model then echoed the English names
 * into about half of the Turkish readings ("Sun Pisces burcunda").
 *
 * `localizeAstroTerms` rewrites those names into Turkish in text bound for a
 * Turkish prompt or a Turkish template reading. It runs on prose only — never
 * on the API's structured fields, which stay English for the app's own i18n.
 * Templates splice bare names (no suffix after the value), so a plain
 * whole-word swap keeps Turkish vowel harmony intact.
 */

type Locale = 'en' | 'tr';

const TR_TERMS: Record<string, string> = {
  // Multi-word points first so "North Node" never becomes "North Düğüm".
  'North Node': 'Kuzey Ay Düğümü',
  'South Node': 'Güney Ay Düğümü',
  Aries: 'Koç',
  Taurus: 'Boğa',
  Gemini: 'İkizler',
  Cancer: 'Yengeç',
  Leo: 'Aslan',
  Virgo: 'Başak',
  Libra: 'Terazi',
  Scorpio: 'Akrep',
  Sagittarius: 'Yay',
  Capricorn: 'Oğlak',
  Aquarius: 'Kova',
  Pisces: 'Balık',
  Sun: 'Güneş',
  Moon: 'Ay',
  Mercury: 'Merkür',
  Venus: 'Venüs',
  Jupiter: 'Jüpiter',
  Saturn: 'Satürn',
  Uranus: 'Uranüs',
  Neptune: 'Neptün',
  Pluto: 'Plüton',
  Chiron: 'Kiron',
  Ascendant: 'Yükselen',
  Midheaven: 'Tepe Noktası',
  Conjunction: 'kavuşum',
  Sextile: 'altmışlık',
  Square: 'kare',
  Trine: 'üçgen',
  Opposition: 'karşıt',
  conjunction: 'kavuşum',
  sextile: 'altmışlık',
  square: 'kare',
  trine: 'üçgen',
  opposition: 'karşıt',
  harmonic: 'uyumlu',
  challenging: 'zorlayıcı',
  Fire: 'Ateş',
  Earth: 'Toprak',
  Air: 'Hava',
  Water: 'Su',
  Cardinal: 'Öncü',
  Fixed: 'Sabit',
  Mutable: 'Değişken',
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TR_PATTERN = new RegExp(
  `(?<!\\p{L})(?:${Object.keys(TR_TERMS)
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join('|')})(?!\\p{L})`,
  'gu',
);

/** Turkish names for the English astrology terms in `text`; other locales pass through. */
export function localizeAstroTerms(text: string, locale: Locale): string {
  if (locale !== 'tr' || !text) return text;
  return text.replace(TR_PATTERN, (m) => TR_TERMS[m] ?? m);
}

/** The same rewrite over every string inside a template reading (objects, arrays). */
export function localizeAstroDeep<T>(value: T, locale: Locale): T {
  if (locale !== 'tr') return value;
  if (typeof value === 'string') return localizeAstroTerms(value, locale) as T;
  if (Array.isArray(value)) return value.map((v) => localizeAstroDeep(v, locale)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, localizeAstroDeep(v, locale)]),
    ) as T;
  }
  return value;
}
