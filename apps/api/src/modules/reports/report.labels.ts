import { Locale } from '../astrology/interpretation.types';
import type { TimelineEvent } from '../astrology/transit-timeline.service';
import { planetName, signName } from '../election/election.labels';

const MONTH: Record<Locale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  tr: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
};

const ASPECT: Record<Locale, Record<string, string>> = {
  en: { Conjunction: 'conjunct', Sextile: 'sextile', Square: 'square', Trine: 'trine', Opposition: 'opposite' },
  tr: { Conjunction: 'kavuşum', Sextile: 'altmışlık', Square: 'kare', Trine: 'üçgen', Opposition: 'karşıtlık' },
};

const POINT: Record<Locale, Record<string, string>> = {
  en: { Ascendant: 'Ascendant', Midheaven: 'Midheaven (MC)' },
  tr: { Ascendant: 'Yükselen', Midheaven: 'Tepe Noktası (MC)' },
};

/** "2027-10-30" → "30 Oct 2027" / "30 Eki 2027". */
export function fullDate(iso: string, l: Locale): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTH[l][m - 1]} ${y}`;
}

export function pointName(p: string, l: Locale): string {
  return POINT[l][p] ?? planetName(p, l);
}

/**
 * One timeline event as a plain, dated line — the facts the AI writes about,
 * and the row text in the PDF's month-by-month table.
 */
export function describeEvent(e: TimelineEvent, l: Locale): string {
  const p = planetName(e.planet, l);
  const tr = l === 'tr';
  switch (e.kind) {
    case 'aspect': {
      const target = pointName(e.target ?? '', l);
      const asp = ASPECT[l][e.aspect ?? ''] ?? e.aspect;
      const span = e.start === e.end ? fullDate(e.start, l) : `${fullDate(e.start, l)} → ${fullDate(e.end, l)}`;
      const exact = e.exact.length
        ? tr
          ? ` (tam: ${e.exact.map((d) => fullDate(d, l)).join(', ')})`
          : ` (exact: ${e.exact.map((d) => fullDate(d, l)).join(', ')})`
        : '';
      return tr ? `${p} ↔ natal ${target}: ${asp} — ${span}${exact}` : `${p} ${asp} natal ${target} — ${span}${exact}`;
    }
    case 'house_ingress':
      return tr
        ? `${p} ${e.house}. evine giriyor (${signName(e.sign ?? '', l)}) — ${fullDate(e.start, l)}`
        : `${p} enters your ${ordinal(e.house ?? 0)} house (${signName(e.sign ?? '', l)}) — ${fullDate(e.start, l)}`;
    case 'sign_ingress':
      return tr
        ? `${p} ${signName(e.sign ?? '', l)} burcuna geçiyor — ${fullDate(e.start, l)}`
        : `${p} moves into ${signName(e.sign ?? '', l)} — ${fullDate(e.start, l)}`;
    case 'station': {
      const where = `${signName(e.sign ?? '', l)}${e.house ? (tr ? `, ${e.house}. ev` : `, ${ordinal(e.house)} house`) : ''}`;
      if (tr) return `${p} ${e.direction === 'retrograde' ? 'retro başlıyor' : 'düz harekete dönüyor'} (${where}) — ${fullDate(e.start, l)}`;
      return `${p} ${e.direction === 'retrograde' ? 'turns retrograde' : 'turns direct'} (${where}) — ${fullDate(e.start, l)}`;
    }
    case 'eclipse': {
      const where = `${signName(e.sign ?? '', l)}${e.house ? (tr ? `, ${e.house}. ev` : `, ${ordinal(e.house)} house`) : ''}`;
      if (tr) return `${e.eclipse === 'solar' ? 'Güneş' : 'Ay'} tutulması (${where}) — ${fullDate(e.start, l)}`;
      return `${e.eclipse === 'solar' ? 'Solar' : 'Lunar'} eclipse (${where}) — ${fullDate(e.start, l)}`;
    }
  }
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}
