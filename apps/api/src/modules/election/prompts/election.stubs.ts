import { Locale } from '../../astrology/interpretation.types';
import { ELECTION_PROFILES } from '../election.events';
import { shortDate } from '../election.labels';
import { ElectionCheck, ElectionCheckReading, ElectionSearch, ElectionSearchReading } from '../election.types';

/**
 * Templated readings for when no AI key is set or the model fails — built
 * from the computed result, so they still say something true.
 */

export function electionCheckStub(locale: Locale, r: ElectionCheck): ElectionCheckReading {
  const name = ELECTION_PROFILES[r.event.id].name[locale];
  const good = r.factors.filter((f) => f.tone === 'good').slice(0, 2).map((f) => f.label);
  const bad = r.factors.filter((f) => f.tone === 'bad').slice(0, 2).map((f) => f.label);
  const hour = r.hours[0];
  const alt = r.alternatives[0];
  const tr = locale === 'tr';
  const verdict: Record<string, string> = tr
    ? { excellent: 'çok uygun', good: 'uygun', mixed: 'karışık', avoid: 'zayıf' }
    : { excellent: 'excellent', good: 'good', mixed: 'mixed', avoid: 'weak' };

  return {
    summary: tr
      ? `${shortDate(r.date, locale)}, ${name.toLocaleLowerCase('tr-TR')} için ${verdict[r.verdict]} bir gün (${r.score}/100).`
      : `${shortDate(r.date, locale)} is a ${verdict[r.verdict]} day for ${name.toLowerCase()} (${r.score}/100).`,
    why: tr
      ? `Destekleyenler: ${good.join('; ') || '—'}. Zorlayanlar: ${bad.join('; ') || '—'}.`
      : `In its favour: ${good.join('; ') || '—'}. Against it: ${bad.join('; ') || '—'}.`,
    advice: tr
      ? `${hour ? `Gün içinde en güçlü aralık ${hour.from}–${hour.to}.` : ''}${alt ? ` Daha güçlü bir seçenek: ${shortDate(alt.date, locale)} (${alt.score}/100).` : ''}`.trim()
      : `${hour ? `The strongest stretch of the day is ${hour.from}–${hour.to}.` : ''}${alt ? ` A stronger option: ${shortDate(alt.date, locale)} (${alt.score}/100).` : ''}`.trim(),
    caution: tr
      ? 'Yıldızlar eğilim gösterir; hazırlığın ve niyetin her zaman belirleyicidir.'
      : 'The sky shows tendencies; your preparation and intent still decide the outcome.',
  };
}

export function electionSearchStub(locale: Locale, r: ElectionSearch): ElectionSearchReading {
  const name = ELECTION_PROFILES[r.event.id].name[locale];
  const tr = locale === 'tr';
  const best = r.top.slice(0, 3).map((p) => `${shortDate(p.date, locale)} (${p.score})`).join(', ');
  const avoid = r.avoid.map((a) => a.label).join(', ');
  return {
    summary: tr
      ? `${name} için öne çıkan tarihler: ${best || '—'}.${avoid ? ` Uzak durulacak dönemler: ${avoid}.` : ''} Her tarihin yanında o günün en güçlü saatleri de var.`
      : `The standout dates for ${name.toLowerCase()}: ${best || '—'}.${avoid ? ` Periods to avoid: ${avoid}.` : ''} Each date comes with its strongest hours.`,
    tips: tr
      ? ['Tarihi seçtikten sonra saatini de önerilen aralığa denk getir.', 'Retro ve tutulma dönemlerine denk gelen işlemleri öne ya da arkaya al.', 'Bir tarihin ayrıntısına dokunarak gününün tam dökümünü gör.']
      : ['Once you pick a date, time it within the suggested hours.', 'Move anything that falls in a retrograde or eclipse window.', 'Tap a date to see the full breakdown of that day.'],
  };
}
